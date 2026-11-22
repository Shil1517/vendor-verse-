import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { PaymentRecordsService } from "./payment-records.service";

const user = { userId: "buyer", sessionId: "session" };
const result = (rows: unknown[]) => ({ rows, rowCount: rows.length });
const request = {
  parentType: "booking" as const, parentId: "booking", mode: "A" as const,
  amountMinor: 1000, currency: "INR", status: "reported received",
};

function harness() {
  const query = jest.fn();
  const clientQuery = jest.fn();
  const record = jest.fn();
  const database = {
    query,
    transaction: (fn: (client: unknown) => Promise<unknown>) => fn({ query: clientQuery }),
  } as unknown as DatabaseService;
  return { service: new PaymentRecordsService(database, { record } as unknown as AuditService), query, clientQuery, record };
}

describe("PaymentRecordsService", () => {
  it("hides transactions from nonparticipants", async () => {
    const h = harness();
    h.query.mockResolvedValueOnce(result([{ state: "confirmed", buyer_id: "other", vendor_id: "vendor" }]));
    await expect(h.service.list(user, request)).rejects.toBeInstanceOf(NotFoundException);
    expect(h.query).toHaveBeenCalledTimes(1);
  });

  it("allows only the vendor to record a Mode A receipt", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(result([{ state: "confirmed", buyer_id: user.userId, vendor_id: "vendor" }]));
    await expect(h.service.create(user, request)).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.clientQuery).toHaveBeenCalledTimes(1);
  });

  it("requires agreed transaction terms before a record is added", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(result([{ state: "requested", buyer_id: "buyer", vendor_id: "vendor" }]));
    await expect(h.service.create(user, { ...request, mode: "B" })).rejects.toBeInstanceOf(ConflictException);
    expect(h.record).not.toHaveBeenCalled();
  });

  it("records a Mode B statement without funds movement", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(result([{ state: "confirmed", buyer_id: "buyer", vendor_id: "vendor" }]));
    h.clientQuery.mockResolvedValueOnce(result([{
      id: "record", mode: "B", amount_minor: "1000", currency: "INR", status: "invoice issued",
      external_reference: null, terms_snapshot: {}, recorded_by_user_id: "buyer",
      created_at: new Date(), updated_at: new Date(),
    }]));
    const created = await h.service.create(user, { ...request, mode: "B", status: "invoice issued" });
    expect(created.amountMinor).toBe("1000");
    expect(h.record).toHaveBeenCalledWith(expect.objectContaining({ action: "payment_record.created" }), expect.anything());
    expect(h.clientQuery.mock.calls.map(([sql]) => String(sql)).join(" ")).not.toMatch(/UPDATE\s+bookings|INSERT\s+INTO\s+(payments|transfers)/i);
  });
});
