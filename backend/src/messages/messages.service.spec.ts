import { BadRequestException, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { NotificationsService } from "../notifications/notifications.service";
import { MessagesService } from "./messages.service";

const user = { userId: "customer", sessionId: "session" };
const result = (rows: unknown[]) => ({ rows, rowCount: rows.length });

function harness() {
  const query = jest.fn();
  const clientQuery = jest.fn();
  const database = {
    query,
    transaction: (fn: (client: unknown) => Promise<unknown>) => fn({ query: clientQuery }),
  } as unknown as DatabaseService;
  const notify = jest.fn();
  const service = new MessagesService(database, { notify } as unknown as NotificationsService);
  return { service, query, clientQuery, notify };
}

describe("MessagesService", () => {
  it("does not let a customer start a conversation with their own vendor", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(result([{ owner_user_id: user.userId }]));
    await expect(h.service.start(user, { vendorId: "vendor" })).rejects.toBeInstanceOf(BadRequestException);
    expect(h.clientQuery).toHaveBeenCalledTimes(1);
  });

  it("reuses an existing customer and vendor conversation", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(result([{ owner_user_id: "owner" }]));
    h.clientQuery.mockResolvedValueOnce(result([])); // advisory lock
    h.clientQuery.mockResolvedValueOnce(result([{ id: "thread" }]));
    h.query.mockResolvedValueOnce(result([{ id: "thread", state: "open", vendor_id: "vendor", vendor_name: "Vendor", vendor_owner_id: "owner", listing_id: null, created_at: new Date(), last_message_at: null }]));
    h.query.mockResolvedValueOnce(result([]));
    const conversation = await h.service.start(user, { vendorId: "vendor" });
    expect(conversation.id).toBe("thread");
    expect(h.clientQuery.mock.calls.some(([sql]) => String(sql).includes("INSERT INTO conversations"))).toBe(false);
  });

  it("refuses messages from a nonparticipant", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(result([]));
    await expect(h.service.send(user, "thread", { body: "Hello" })).rejects.toBeInstanceOf(NotFoundException);
    expect(h.notify).not.toHaveBeenCalled();
  });

  it("stores a participant message and notifies the other participant", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(result([{ recipient_user_id: "owner", state: "open" }]));
    h.clientQuery.mockResolvedValueOnce(result([{ id: "message", sent_at: new Date() }]));
    h.clientQuery.mockResolvedValueOnce(result([]));
    h.notify.mockResolvedValueOnce("notification");
    const sent = await h.service.send(user, "thread", { body: "Hello" });
    expect(sent.body).toBe("Hello");
    expect(h.notify).toHaveBeenCalledWith(expect.objectContaining({
      recipientUserId: "owner",
      linkedResource: { type: "conversation", id: "thread" },
    }), expect.anything());
  });
});
