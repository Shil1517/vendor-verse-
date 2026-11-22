import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AuditService } from "../platform/audit.service";
import { ReviewsService } from "./reviews.service";

const user = { userId: "buyer", sessionId: "session" };
const result = (rows: unknown[]) => ({ rows, rowCount: rows.length });
const body = { transactionType: "booking" as const, transactionId: "booking", overallRating: 5 };

function harness() {
  const query = jest.fn();
  const clientQuery = jest.fn();
  const record = jest.fn();
  const notify = jest.fn();
  const database = { query, transaction: (fn: (client: unknown) => Promise<unknown>) => fn({ query: clientQuery }) } as unknown as DatabaseService;
  const service = new ReviewsService(database, { record } as unknown as AuditService, { notify } as unknown as NotificationsService);
  return { service, query, clientQuery, record, notify };
}

describe("ReviewsService", () => {
  it("hides another buyer's transaction", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(result([{ buyer_id: "other", vendor_id: "vendor", vendor_owner_id: "owner", state: "closed" }]));
    await expect(h.service.create(user, body)).rejects.toBeInstanceOf(NotFoundException);
    expect(h.record).not.toHaveBeenCalled();
  });

  it("requires transaction completion", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(result([{ buyer_id: "buyer", vendor_id: "vendor", vendor_owner_id: "owner", state: "confirmed" }]));
    await expect(h.service.create(user, body)).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects duplicate rating dimensions before writing", async () => {
    const h = harness();
    await expect(h.service.create(user, { ...body, dimensions: [
      { dimension: "Quality", rating: 4 }, { dimension: "quality", rating: 5 },
    ] })).rejects.toBeInstanceOf(BadRequestException);
    expect(h.clientQuery).not.toHaveBeenCalled();
  });

  it("creates one review and notifies the vendor", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(result([{ buyer_id: "buyer", vendor_id: "vendor", vendor_owner_id: "owner", state: "closed" }]));
    h.clientQuery.mockResolvedValueOnce(result([{ id: "review" }]));
    h.query.mockResolvedValueOnce(result([{
      id: "review", vendor_id: "vendor", transaction_type: "booking", transaction_id: "booking",
      overall_rating: 5, comment: null, vendor_response: null, vendor_responded_at: null,
      moderation_state: "published", created_at: new Date(), dimensions: [],
    }]));
    const review = await h.service.create(user, body);
    expect(review.id).toBe("review");
    expect(h.record).toHaveBeenCalledWith(expect.objectContaining({ action: "review.created" }), expect.anything());
    expect(h.notify).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: "owner" }), expect.anything());
  });

  it("prevents a second vendor response", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(result([{ vendor_response: "Already answered" }]));
    await expect(h.service.respond(user, "review", "Thanks")).rejects.toBeInstanceOf(ConflictException);
  });
});
