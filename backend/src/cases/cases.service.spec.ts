import { ConflictException, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { CasesService } from "./cases.service";

const user = { userId: "reporter", sessionId: "session" };
const rows = (items: unknown[]) => ({ rows: items, rowCount: items.length });

function harness() {
  const query = jest.fn();
  const clientQuery = jest.fn();
  const record = jest.fn();
  const database = { query, transaction: (fn: (client: unknown) => Promise<unknown>) => fn({ query: clientQuery }) } as unknown as DatabaseService;
  return { service: new CasesService(database, { record } as unknown as AuditService), query, clientQuery, record };
}

describe("CasesService", () => {
  it("does not let a nonparticipant report a private booking", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(rows([]));
    await expect(h.service.report(user, { targetType: "booking", targetId: "booking", reason: "Problem" }))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(h.clientQuery).toHaveBeenCalledTimes(1);
  });

  it("records a report after verifying its public target", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(rows([{}]));
    h.clientQuery.mockResolvedValueOnce(rows([{
      id: "report", reporter_user_id: "reporter", target_type: "vendor", target_id: "vendor",
      reason: "Problem", details: null, created_at: new Date(),
    }]));
    const created = await h.service.report(user, { targetType: "vendor", targetId: "vendor", reason: "Problem" });
    expect(created.id).toBe("report");
    expect(h.clientQuery.mock.calls[0][1]).toEqual(["vendor"]);
    expect(h.record).toHaveBeenCalledWith(expect.objectContaining({ action: "report.created" }), expect.anything());
  });

  it("prevents two cases for one report", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(rows([{ id: "report", reporter_user_id: "reporter", target_type: "vendor" }]));
    h.clientQuery.mockResolvedValueOnce(rows([{}]));
    await expect(h.service.open(user, "report", { subject: "Problem", severity: "owner configured" }))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it("requires a different reviewer for an appeal", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(rows([{
      id: "appeal", case_id: "case", appellant_user_id: "another", status: "submitted",
    }]));
    h.clientQuery.mockResolvedValueOnce(rows([{}]));
    await expect(h.service.decideAppeal(user, "appeal", { outcome: "upheld", reason: "Reviewed" }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(h.record).not.toHaveBeenCalled();
  });
});
