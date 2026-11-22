import { NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { AgentsService } from "./agents.service";

const user = { userId: "agent", sessionId: "session" };
const rows = (items: unknown[]) => ({ rows: items, rowCount: items.length });

function harness() {
  const query = jest.fn();
  const clientQuery = jest.fn();
  const record = jest.fn();
  const database = { query, transaction: (fn: (client: unknown) => Promise<unknown>) => fn({ query: clientQuery }) } as unknown as DatabaseService;
  return { service: new AgentsService(database, { record } as unknown as AuditService), query, clientQuery, record };
}

describe("AgentsService", () => {
  it("does not create a lead for an inactive profile", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(rows([]));
    await expect(h.service.create(user, { prospectName: "Prospect" })).rejects.toBeInstanceOf(NotFoundException);
    expect(h.clientQuery).toHaveBeenCalledTimes(1);
  });

  it("scopes lead detail to the assigned agent", async () => {
    const h = harness();
    h.query.mockResolvedValueOnce(rows([]));
    await expect(h.service.get(user, "lead")).rejects.toBeInstanceOf(NotFoundException);
    expect(h.query.mock.calls[0][1]).toEqual(["lead", "agent"]);
  });

  it("audits a new lead in the creation transaction", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(rows([{}]));
    h.clientQuery.mockResolvedValueOnce(rows([{
      id: "lead", assigned_agent_user_id: "agent", created_by_user_id: "agent",
      prospect_name: "Prospect", business_name: null, contact_details: {}, status: "new",
      converted_vendor_id: null, created_at: new Date(), updated_at: new Date(),
    }]));
    const lead = await h.service.create(user, { prospectName: "Prospect" });
    expect(lead.id).toBe("lead");
    expect(h.record).toHaveBeenCalledWith(expect.objectContaining({ action: "sales_lead.created" }), expect.anything());
  });
});
