import { ConflictException, ForbiddenException } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { ListingReviewService } from "./listing-review.service";

const actor: AuthenticatedUser = { userId: "admin1", sessionId: "s1" };
const result = (rows: unknown[] = [], rowCount = rows.length) => ({
  rows,
  rowCount,
});

function harness() {
  const query = jest.fn();
  const clientQuery = jest.fn();
  const record = jest.fn().mockResolvedValue(undefined);
  const database = {
    query,
    transaction: (operation: (client: unknown) => unknown) =>
      operation({ query: clientQuery }),
  } as unknown as DatabaseService;
  const audit = { record } as unknown as AuditService;
  return { query, clientQuery, record, database, audit };
}

describe("ListingReviewService", () => {
  it("does not approve a listing while its media is pending moderation", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(
        result([
          {
            vendor_id: "v1",
            owner_user_id: "vendor1",
            content_state: "pending_review",
          },
        ]),
      )
      .mockResolvedValueOnce(result([{ count: 1 }]));

    await expect(
      new ListingReviewService(h.database, h.audit).review(
        actor,
        "l1",
        "approved",
        "Reviewed listing",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      h.clientQuery.mock.calls.some(([sql]) =>
        String(sql).includes("UPDATE listings"),
      ),
    ).toBe(false);
    expect(h.record).not.toHaveBeenCalled();
  });

  it("does not approve a listing while a duplicate flag is unresolved", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(
        result([
          {
            vendor_id: "v1",
            owner_user_id: "vendor1",
            content_state: "pending_review",
          },
        ]),
      )
      .mockResolvedValueOnce(result([{ count: 0 }]))
      .mockResolvedValueOnce(result([{ count: 1 }]));

    await expect(
      new ListingReviewService(h.database, h.audit).review(
        actor,
        "l1",
        "approved",
        "Reviewed listing",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      h.clientQuery.mock.calls.some(([sql]) =>
        String(sql).includes("UPDATE listings"),
      ),
    ).toBe(false);
  });

  it("stores and audits a reasoned content decision", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(
        result([
          {
            vendor_id: "v1",
            owner_user_id: "vendor1",
            content_state: "pending_review",
          },
        ]),
      )
      .mockResolvedValueOnce(result([{ count: 0 }]))
      .mockResolvedValue(result());

    const review = await new ListingReviewService(h.database, h.audit).review(
      actor,
      "l1",
      "approved",
      "Content and media meet policy",
    );

    expect(review).toMatchObject({
      listingId: "l1",
      status: "approved",
      reason: "Content and media meet policy",
    });
    expect(
      h.clientQuery.mock.calls.some(
        ([sql, values]) =>
          String(sql).includes("INSERT INTO listing_reviews") &&
          values[4] === "Content and media meet policy",
      ),
    ).toBe(true);
    expect(h.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "listing.review.approved",
        reason: "Content and media meet policy",
      }),
      expect.anything(),
    );
  });

  it("prevents a vendor owner from reviewing their own listing", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(
      result([
        {
          vendor_id: "v1",
          owner_user_id: actor.userId,
          content_state: "pending_review",
        },
      ]),
    );
    await expect(
      new ListingReviewService(h.database, h.audit).review(
        actor,
        "l1",
        "rejected",
        "Reason",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.record).not.toHaveBeenCalled();
  });

  it("returns media and duplicate flags in the review queue", async () => {
    const h = harness();
    h.query.mockResolvedValueOnce(
      result([
        {
          id: "l1",
          vendor_id: "v1",
          vendor_name: "Vendor",
          category_id: "cat1",
          category_name: "Electrical",
          subcategory_id: null,
          listing_type: "service",
          title: "Electrician",
          description: null,
          content_state: "pending_review",
          price_on_request: false,
          price_min_minor: null,
          price_max_minor: null,
          price_currency: null,
          price_unit: null,
          attributes: {},
          updated_at: new Date("2026-11-05T10:00:00Z"),
          media: [
            {
              id: "m1",
              fileId: "f1",
              mediaType: "photo",
              caption: null,
              sortOrder: 0,
              moderationState: "pending",
              createdAt: "2026-11-05T10:00:00.000Z",
            },
          ],
          duplicate_flags: [
            {
              id: "d1",
              otherListingId: "l2",
              reviewStatus: "pending",
            },
          ],
        },
      ]),
    );

    const queue = await new ListingReviewService(
      h.database,
      h.audit,
    ).listReviewQueue({ limit: 10 });
    expect(queue.listings[0]).toMatchObject({
      id: "l1",
      media: [{ id: "m1", fileId: "f1", moderationState: "pending" }],
      duplicateFlags: [{ id: "d1", otherListingId: "l2" }],
    });
    expect(queue.nextCursor).toBeNull();
  });
});
