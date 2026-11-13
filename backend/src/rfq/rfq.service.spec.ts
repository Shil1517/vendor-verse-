import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { OutboxService } from "../platform/outbox.service";
import { RfqService } from "./rfq.service";

const user: AuthenticatedUser = { userId: "user-1", sessionId: "session-1" };
const result = (rows: unknown[] = []) => ({ rows, rowCount: rows.length });

function harness() {
  const query = jest.fn();
  const clientQuery = jest.fn();
  const record = jest.fn().mockResolvedValue(undefined);
  const enqueue = jest.fn().mockResolvedValue(undefined);
  const database = {
    query,
    transaction: (operation: (client: unknown) => unknown) =>
      operation({ query: clientQuery }),
  } as unknown as DatabaseService;
  return {
    service: new RfqService(
      database,
      { record } as unknown as AuditService,
      { enqueue } as unknown as OutboxService,
      { createFromAcceptedTerms: jest.fn() } as never,
      { createFromAcceptedTerms: jest.fn() } as never,
      { createFromAcceptedTerms: jest.fn() } as never,
      { get: jest.fn() } as never,
    ),
    query,
    clientQuery,
    record,
    enqueue,
  };
}

describe("RfqService", () => {
  it("creates an immutable initial revision and an audit/outbox event", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(result([{ current_version: 4 }]))
      .mockResolvedValueOnce(result([{ id: "rfq-1" }]))
      .mockResolvedValueOnce(result([{ id: "revision-1" }]));
    h.record.mockResolvedValueOnce(undefined);
    h.enqueue.mockResolvedValueOnce(undefined);
    h.clientQuery.mockResolvedValueOnce(
      result([
        {
          id: "rfq-1",
          customer_user_id: user.userId,
          category_id: "category-1",
          kind: "goods",
          state: "draft",
          current_revision: 1,
          quote_deadline_at: null,
          requirements: { quantity: 3 },
          created_at: new Date("2026-11-13T04:00:00Z"),
          updated_at: new Date("2026-11-13T04:00:00Z"),
        },
      ]),
    );

    const created = await h.service.create(user, {
      categoryId: "category-1",
      kind: "goods",
      requirements: { quantity: 3 },
    });

    expect(created).toMatchObject({
      id: "rfq-1",
      state: "draft",
      currentRevision: 1,
      requirements: { quantity: 3 },
    });
    expect(h.clientQuery.mock.calls[2][0]).toContain("INSERT INTO rfq_revisions");
    expect(h.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "rfq.create", targetId: "rfq-1" }),
      expect.anything(),
    );
    expect(h.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "rfq.created" }),
      expect.anything(),
    );
  });

  it("rejects opening when a selected vendor is not eligible", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(
        result([
          {
            id: "rfq-1",
            category_id: "category-1",
            state: "draft",
            current_revision: 1,
            quote_deadline_at: null,
          },
        ]),
      )
      .mockResolvedValueOnce(result());

    await expect(
      h.service.open(user, "rfq-1", {
        quoteDeadlineAt: "2099-01-01T00:00:00.000Z",
        vendorIds: ["vendor-1"],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(h.clientQuery).toHaveBeenCalledTimes(2);
    expect(h.record).not.toHaveBeenCalled();
  });

  it("does not return an RFQ to a user who is neither party", async () => {
    const h = harness();
    h.query.mockResolvedValueOnce(result());
    await expect(h.service.get(user, "rfq-1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(h.query.mock.calls[0][0]).toContain("vendor.owner_user_id = $2");
    expect(h.query.mock.calls[0][1]).toEqual(["rfq-1", user.userId]);
  });

  it("accepts one submitted quote under an RFQ lock and snapshots its terms", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(
        result([
          {
            id: "rfq-1",
            category_id: "category-1",
            kind: "service",
            state: "open",
            current_revision: 2,
            quote_deadline_at: new Date("2099-01-01T00:00:00Z"),
          },
        ]),
      )
      .mockResolvedValueOnce(
        result([
          {
            current_revision: 1,
            state: "submitted",
            vendor_id: "vendor-1",
            revision_id: "quote-revision-1",
            currency: "INR",
            total_minor: "25000",
            scope: "Supply materials",
            inclusions: [],
            exclusions: [],
            timeline: {},
            terms: {},
          },
        ]),
      )
      .mockResolvedValueOnce(
        result([
          {
            requirements: {},
            configuration: { rfqFulfillmentType: "work_order" },
          },
        ]),
      )
      .mockResolvedValueOnce(result())
      .mockResolvedValueOnce(result([{ id: "snapshot-1" }]))
      .mockResolvedValueOnce(result([{ id: "work-order-1" }]))
      .mockResolvedValueOnce(result())
      .mockResolvedValueOnce(result());

    const accepted = await h.service.acceptQuote(user, "rfq-1", "quote-1");

    expect(accepted).toMatchObject({
      rfqId: "rfq-1",
      quoteId: "quote-1",
      acceptedTermsSnapshotId: "snapshot-1",
      fulfillment: { type: "work_order", id: "work-order-1" },
      terms: { totalMinor: 25000, currency: "INR" },
    });
    expect(h.clientQuery.mock.calls[0][0]).toContain("FOR UPDATE");
    expect(h.clientQuery.mock.calls[4][0]).toContain("accepted_terms_snapshots");
    expect(h.clientQuery.mock.calls[7][0]).toContain(
      "ELSE 'unsuccessful'",
    );
    expect(h.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "quote.accept" }),
      expect.anything(),
    );
  });
});
