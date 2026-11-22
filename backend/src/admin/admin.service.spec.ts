import { BadRequestException, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { AdminService } from "./admin.service";

const actor = { userId: "admin", sessionId: "session" };
const rows = (items: unknown[]) => ({ rows: items, rowCount: items.length });

function harness() {
  const query = jest.fn();
  const clientQuery = jest.fn();
  const record = jest.fn();
  const database = { query, transaction: (fn: (client: unknown) => Promise<unknown>) => fn({ query: clientQuery }) } as unknown as DatabaseService;
  return { service: new AdminService(database, { record } as unknown as AuditService), query, clientQuery, record };
}

describe("AdminService", () => {
  it("returns numeric operational queue counts", async () => {
    const h = harness();
    h.query.mockResolvedValueOnce(rows([{ verification_queue: "2", failed_subscriptions: "3" }]));
    await expect(h.service.dashboard()).resolves.toEqual({ counts: { verification_queue: 2, failed_subscriptions: 3 } });
  });

  it("refuses an unknown configuration code", async () => {
    const h = harness();
    h.query.mockResolvedValueOnce(rows([]));
    await expect(h.service.configItem("CFG-99")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("audits a configuration decision in its transaction", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(rows([{ code: "CFG-01", status: "open" }]));
    h.clientQuery.mockResolvedValueOnce(rows([{ code: "CFG-01", title: "Plans", owner: "Business",
      required_decision: "Prices", status: "decided", decided_value: { plan: "A" },
      decided_by_user_id: "admin", decided_at: new Date(), updated_at: new Date() }]));
    const decided = await h.service.decideConfig(actor, "CFG-01", { decidedValue: { plan: "A" }, reason: "Approved" });
    expect(decided.status).toBe("decided");
    expect(h.record).toHaveBeenCalledWith(expect.objectContaining({ action: "config.decided", reason: "Approved" }), expect.anything());
  });

  it("requires a reason for a setting change", async () => {
    const h = harness();
    await expect(h.service.putSetting(actor, "maintenance", { value: { enabled: true }, reason: " " }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(h.clientQuery).not.toHaveBeenCalled();
  });
});
