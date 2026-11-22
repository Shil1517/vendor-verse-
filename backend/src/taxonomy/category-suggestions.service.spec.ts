import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { CategorySuggestionsService } from "./category-suggestions.service";

const user = { userId: "vendor-owner", sessionId: "session" };
const rows = (items: unknown[]) => ({ rows: items, rowCount: items.length });

function harness() {
  const query = jest.fn();
  const clientQuery = jest.fn();
  const record = jest.fn();
  const database = {
    query,
    transaction: (fn: (client: unknown) => Promise<unknown>) => fn({ query: clientQuery }),
  } as unknown as DatabaseService;
  const service = new CategorySuggestionsService(database, { record } as unknown as AuditService);
  return { service, query, clientQuery, record };
}

describe("CategorySuggestionsService", () => {
  it("requires a vendor-owned approved category before submission", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(rows([]));
    await expect(h.service.create(user, {
      vendorId: "vendor", industryId: "industry", nearestCategoryId: "category", proposedPath: ["New category"],
    })).rejects.toBeInstanceOf(NotFoundException);
    expect(h.clientQuery).toHaveBeenCalledTimes(1);
  });

  it("refuses blank category path parts", async () => {
    const h = harness();
    await expect(h.service.create(user, {
      vendorId: "vendor", industryId: "industry", nearestCategoryId: "category", proposedPath: ["  "],
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(h.clientQuery).not.toHaveBeenCalled();
  });

  it("prevents reviewers from deciding their own suggestions", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(rows([{ id: "suggestion", status: "submitted", submitted_by_user_id: user.userId }]));
    await expect(h.service.decide(user, "suggestion", {
      decision: "rejected", reason: "Duplicate",
    })).rejects.toBeInstanceOf(ConflictException);
    expect(h.record).not.toHaveBeenCalled();
  });

  it("requires a category created in the same industry for approval", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(rows([{ id: "suggestion", status: "submitted", industry_id: "industry", submitted_by_user_id: "another" }]));
    h.clientQuery.mockResolvedValueOnce(rows([]));
    await expect(h.service.decide(user, "suggestion", {
      decision: "approved", reason: "Fits", createdCategoryId: "other-industry-category",
    })).rejects.toBeInstanceOf(NotFoundException);
    expect(h.clientQuery).toHaveBeenCalledTimes(2);
  });
});
