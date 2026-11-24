import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { SubscriptionsService } from "./subscriptions.service";

const user = { userId: "owner", sessionId: "session" };
const rows = (items: unknown[]) => ({ rows: items, rowCount: items.length });

function harness() {
  const query = jest.fn();
  const clientQuery = jest.fn();
  const record = jest.fn();
  const database = { query, transaction: (fn: (client: unknown) => Promise<unknown>) => fn({ query: clientQuery }) } as unknown as DatabaseService;
  return { service: new SubscriptionsService(database, { record } as unknown as AuditService), query, clientQuery, record };
}

describe("SubscriptionsService", () => {
  it("does not expose another vendor's subscription", async () => {
    const h = harness();
    h.query.mockResolvedValueOnce(rows([]));
    await expect(h.service.vendorSubscription(user, "vendor")).rejects.toBeInstanceOf(NotFoundException);
    expect(h.query).toHaveBeenCalledTimes(1);
  });

  it("requires currency with a configured price", async () => {
    const h = harness();
    await expect(h.service.createVersion(user, "plan", { priceMinor: 100, entitlements: {} }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(h.clientQuery).not.toHaveBeenCalled();
  });

  it("does not activate a plan with an incomplete latest version", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(rows([{ status: "draft" }]));
    h.clientQuery.mockResolvedValueOnce(rows([{ price_minor: null, currency: null, billing_interval: null }]));
    await expect(h.service.setStatus(user, "plan", { status: "active", reason: "Ready" }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(h.record).not.toHaveBeenCalled();
  });
});
