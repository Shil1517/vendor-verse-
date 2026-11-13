import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DatabaseService } from "../database/database.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AuditService } from "../platform/audit.service";
import { BookingsService, CONFIRMATION_WINDOW_DAYS } from "./bookings.service";
import { CreateBookingDto, ProposeModificationDto } from "./dto/booking.dto";

const customer = { userId: "cust", sessionId: "s" };
const vendorOwner = { userId: "owner", sessionId: "s" };
const stranger = { userId: "other", sessionId: "s" };
const IST = "Asia/Kolkata";
const result = (rows: unknown[] = [], rowCount = rows.length) => ({
  rows,
  rowCount,
});
const future = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString();

const bookingRow = (over: Record<string, unknown> = {}) => ({
  id: "b1",
  customer_user_id: "cust",
  vendor_owner_id: "owner",
  listing_id: "l1",
  listing_title: "Electrician visit",
  vendor_id: "v1",
  vendor_name: "Sharma",
  customer_name: "Asha",
  booking_mode: "scheduled",
  state: "requested",
  slot_start: null,
  slot_end: null,
  time_zone: null,
  response_due_at: null,
  confirmation_due_at: null,
  series_id: null,
  occurrence_number: null,
  requested_terms: {},
  decline_reason: null,
  cancellation_reason: null,
  cancelled_by_user_id: null,
  capacity_id: null,
  created_at: new Date("2026-11-12T10:00:00Z"),
  updated_at: new Date("2026-11-12T10:00:00Z"),
  ...over,
});

const listingRow = (over: Record<string, unknown> = {}) => ({
  id: "l1",
  vendor_id: "v1",
  owner_user_id: "owner",
  category_id: "cat1",
  config_version_number: 2,
  instant_booking_enabled: false,
  time_zone: IST,
  title: "Electrician visit",
  price_on_request: false,
  price_min_minor: "50000",
  price_max_minor: null,
  price_currency: "INR",
  price_unit: "visit",
  configuration: { cancellationPolicyId: "flex" },
  ...over,
});

function harness() {
  const query = jest.fn();
  const clientQuery = jest.fn();
  const record = jest.fn().mockResolvedValue(undefined);
  const notify = jest.fn().mockResolvedValue("n1");
  const database = {
    query,
    transaction: (operation: (client: unknown) => unknown) =>
      operation({ query: clientQuery }),
  } as unknown as DatabaseService;
  const service = new BookingsService(
    database,
    { record } as unknown as AuditService,
    { notify } as unknown as NotificationsService,
  );
  return { service, query, clientQuery, record, notify };
}

const create = (over: Partial<CreateBookingDto> = {}) =>
  Object.assign(new CreateBookingDto(), { listingId: "l1", ...over });

const slot = { slotStart: future(2), slotEnd: future(3), timeZone: IST };
const usesSql = (calls: unknown[][], fragment: string) =>
  calls.some((call) => (call[0] as string).includes(fragment));

describe("booking DTOs", () => {
  it("need an end and a time zone with a slot start", async () => {
    const dto = plainToInstance(CreateBookingDto, {
      listingId: "11111111-1111-4111-8111-111111111111",
      slotStart: future(2),
    });
    const fields = (await validate(dto)).map((e) => e.property);
    expect(fields).toEqual(expect.arrayContaining(["slotEnd", "timeZone"]));
  });

  it("need at least two occurrences for a series", async () => {
    const dto = plainToInstance(CreateBookingDto, {
      listingId: "11111111-1111-4111-8111-111111111111",
      recurrence: {
        rule: "FREQ=WEEKLY",
        occurrences: [{ slotStart: future(2), slotEnd: future(3) }],
      },
    });
    expect((await validate(dto)).map((e) => e.property)).toContain(
      "recurrence",
    );
  });

  it("need a slot end and zone on a proposal slot", async () => {
    const dto = plainToInstance(ProposeModificationDto, {
      proposedTerms: {},
      slotStart: future(2),
    });
    const fields = (await validate(dto)).map((e) => e.property);
    expect(fields).toEqual(expect.arrayContaining(["slotEnd", "timeZone"]));
  });
});

describe("BookingsService.create", () => {
  it("creates a requested booking with a terms snapshot and tells the vendor", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(result([listingRow()]))
      .mockResolvedValueOnce(result([{ id: "b1" }]))
      .mockResolvedValue(result());
    h.query.mockResolvedValue(result([bookingRow()]));
    const out = await h.service.create(customer, create(slot), "key-1");
    expect(out.bookings[0]).toMatchObject({
      id: "b1",
      state: "requested",
      viewerRole: "customer",
    });
    const insert = h.clientQuery.mock.calls[1];
    expect(insert[1]).toContain("requested");
    expect(insert[1]).toContain("key-1");
    expect(usesSql(h.clientQuery.mock.calls, "booking_terms_snapshots")).toBe(
      true,
    );
    expect(h.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: "owner",
        eventType: "booking.requested",
        dedupeKey: "booking:b1:created",
      }),
      expect.anything(),
    );
  });

  it("does not let a vendor book their own listing", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(result([listingRow()]));
    await expect(
      h.service.create(vendorOwner, create()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("answers 404 for a listing that is not bookable", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(result([]));
    await expect(h.service.create(customer, create())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("rejects instant booking on a listing without it", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(result([listingRow()]));
    await expect(
      h.service.create(customer, create({ mode: "instant", ...slot })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("answers 409 when the last instant slot is already taken (SC-013)", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(
        result([listingRow({ instant_booking_enabled: true })]),
      )
      .mockResolvedValueOnce(result([])); // the conditional UPDATE reserved nothing
    await expect(
      h.service.create(customer, create({ mode: "instant", ...slot })),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("books an instant slot straight to confirmed and takes capacity", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(
        result([listingRow({ instant_booking_enabled: true })]),
      )
      .mockResolvedValueOnce(result([{ id: "cap1" }]))
      .mockResolvedValueOnce(result([{ id: "b1" }]))
      .mockResolvedValue(result());
    h.query.mockResolvedValue(
      result([bookingRow({ state: "confirmed", booking_mode: "instant" })]),
    );
    const out = await h.service.create(
      customer,
      create({ mode: "instant", ...slot }),
    );
    expect(out.bookings[0].state).toBe("confirmed");
    expect(h.clientQuery.mock.calls[1][0]).toContain("reserved < capacity");
    expect(h.clientQuery.mock.calls[2][1]).toContain("confirmed");
  });

  it("returns the first booking on a retried key and gives the capacity back (F-BKG-08)", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(
        result([listingRow({ instant_booking_enabled: true })]),
      )
      .mockResolvedValueOnce(result([{ id: "cap1" }]))
      .mockResolvedValueOnce(result([])) // ON CONFLICT DO NOTHING
      .mockResolvedValueOnce(result()) // release the capacity
      .mockResolvedValueOnce(result([{ id: "b1" }])); // the existing booking
    h.query.mockResolvedValue(result([bookingRow()]));
    const out = await h.service.create(
      customer,
      create({ mode: "instant", ...slot }),
      "key-1",
    );
    expect(out.bookings).toHaveLength(1);
    expect(h.clientQuery.mock.calls[3][0]).toContain("reserved = reserved - 1");
    expect(usesSql(h.clientQuery.mock.calls, "booking_terms_snapshots")).toBe(
      false,
    );
  });

  it("creates a series with one booking per occurrence (F-BKG-03)", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(result([listingRow()]))
      .mockResolvedValueOnce(result([{ id: "s1" }])) // series
      .mockResolvedValueOnce(result([{ id: "b1" }])) // occurrence 1
      .mockResolvedValueOnce(result()) // snapshot
      .mockResolvedValueOnce(result()) // event
      .mockResolvedValueOnce(result()) // audit is a mock; this is a notify no-op
      .mockResolvedValueOnce(result([{ id: "b2" }])) // occurrence 2
      .mockResolvedValue(result());
    h.query.mockResolvedValue(
      result([bookingRow({ series_id: "s1", occurrence_number: 1 })]),
    );
    const out = await h.service.create(
      customer,
      create({
        timeZone: IST,
        recurrence: {
          rule: "FREQ=WEEKLY;COUNT=2",
          occurrences: [
            { slotStart: future(2), slotEnd: future(3) },
            { slotStart: future(9), slotEnd: future(10) },
          ],
        },
      }),
      "key-s",
    );
    expect(out.bookings).toHaveLength(2);
    expect(h.clientQuery.mock.calls[2][1]).toContain("key-s#1");
  });

  it("rejects a slot in the past", async () => {
    const h = harness();
    await expect(
      h.service.create(
        customer,
        create({ slotStart: future(-2), slotEnd: future(-1), timeZone: IST }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("BookingsService.transition", () => {
  it("lets only the vendor accept", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(result([bookingRow()]));
    await expect(
      h.service.transition(customer, "b1", "accept"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("hides the booking from someone who is not a party", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(result([bookingRow()]));
    await expect(
      h.service.transition(stranger, "b1", "cancel"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("does not skip a state", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(
      result([bookingRow({ state: "cancelled" })]),
    );
    await expect(
      h.service.transition(vendorOwner, "b1", "accept"),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("accepts a requested booking, audits it and tells the customer", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(result([bookingRow()]))
      .mockResolvedValue(result());
    h.query.mockResolvedValue(result([bookingRow({ state: "confirmed" })]));
    const out = await h.service.transition(vendorOwner, "b1", "accept");
    expect(out.state).toBe("confirmed");
    expect(h.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "booking.accept",
        actorRole: "vendor",
      }),
      expect.anything(),
    );
    expect(h.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: "cust",
        eventType: "booking.confirmed",
      }),
      expect.anything(),
    );
  });

  it("starts the 7-day confirmation window on completion (F-BKG-06)", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(result([bookingRow({ state: "in_progress" })]))
      .mockResolvedValue(result());
    h.query.mockResolvedValue(
      result([bookingRow({ state: "completed_awaiting" })]),
    );
    await h.service.transition(vendorOwner, "b1", "complete");
    const update = h.clientQuery.mock.calls[1];
    expect(update[0]).toContain("completed_at = CURRENT_TIMESTAMP");
    const due = update[1].find((v: unknown) => v instanceof Date) as Date;
    const days = (due.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(CONFIRMATION_WINDOW_DAYS - 0.01);
    expect(days).toBeLessThanOrEqual(CONFIRMATION_WINDOW_DAYS);
  });

  it("lets only the customer confirm", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(
      result([bookingRow({ state: "completed_awaiting" })]),
    );
    await expect(
      h.service.transition(vendorOwner, "b1", "confirm"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("gives instant capacity back on cancel", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(
        result([bookingRow({ state: "confirmed", capacity_id: "cap1" })]),
      )
      .mockResolvedValue(result());
    h.query.mockResolvedValue(
      result([
        bookingRow({ state: "cancelled", cancelled_by_user_id: "cust" }),
      ]),
    );
    const out = await h.service.cancel(customer, "b1", { reason: "plans" });
    expect(out.cancelledBy).toBe("customer");
    expect(usesSql(h.clientQuery.mock.calls, "GREATEST(reserved - 1, 0)")).toBe(
      true,
    );
  });

  it("cancelling one occurrence leaves the series unless the customer chooses (D-011)", async () => {
    const occurrence = bookingRow({
      state: "confirmed",
      series_id: "s1",
      occurrence_number: 2,
    });
    const cancelled = result([
      bookingRow({ state: "cancelled", cancelled_by_user_id: "cust" }),
    ]);

    const one = harness();
    one.clientQuery
      .mockResolvedValueOnce(result([occurrence]))
      .mockResolvedValue(result());
    one.query.mockResolvedValue(cancelled);
    await one.service.cancel(customer, "b1", {});
    expect(usesSql(one.clientQuery.mock.calls, "series_id = $1")).toBe(false);

    const all = harness();
    all.clientQuery
      .mockResolvedValueOnce(result([occurrence]))
      .mockResolvedValueOnce(result()) // this occurrence
      .mockResolvedValueOnce(result([{ id: "b3", capacity_id: null }]))
      .mockResolvedValue(result());
    all.query.mockResolvedValue(cancelled);
    await all.service.cancel(customer, "b1", { cancelSeries: true });
    expect(all.clientQuery.mock.calls[2][0]).toContain(
      "occurrence_number > $5",
    );
  });

  it("a vendor cannot cancel a whole series", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(
        result([
          bookingRow({
            state: "confirmed",
            series_id: "s1",
            occurrence_number: 1,
          }),
        ]),
      )
      .mockResolvedValue(result());
    h.query.mockResolvedValue(
      result([
        bookingRow({ state: "cancelled", cancelled_by_user_id: "owner" }),
      ]),
    );
    await h.service.cancel(vendorOwner, "b1", { cancelSeries: true });
    expect(usesSql(h.clientQuery.mock.calls, "series_id = $1")).toBe(false);
  });
});

describe("BookingsService modifications (F-BKG-04)", () => {
  const open = (createdBy: string, terms: Record<string, unknown> = {}) =>
    result([{ proposed_terms: terms, created_by_user_id: createdBy }]);
  const applyCall = (calls: unknown[][]) =>
    calls.find((call) =>
      (call[0] as string).includes("requested_terms = requested_terms ||"),
    );

  it("only the other side may accept a proposal", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(result([bookingRow({ state: "confirmed" })]))
      .mockResolvedValueOnce(open("cust"));
    await expect(
      h.service.decideModification(customer, "b1", "m1", "accepted"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("only the proposer may withdraw", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(result([bookingRow({ state: "confirmed" })]))
      .mockResolvedValueOnce(open("cust"));
    await expect(
      h.service.decideModification(vendorOwner, "b1", "m1", "withdrawn"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("changes the booking only when the proposal is accepted", async () => {
    const accepted = harness();
    accepted.clientQuery
      .mockResolvedValueOnce(result([bookingRow({ state: "confirmed" })]))
      .mockResolvedValueOnce(
        open("cust", {
          note: "side door",
          slot: { slotStart: future(5), slotEnd: future(6), timeZone: IST },
        }),
      )
      .mockResolvedValue(result());
    accepted.query
      .mockResolvedValueOnce(result([bookingRow()]))
      .mockResolvedValue(result());
    await accepted.service.decideModification(
      vendorOwner,
      "b1",
      "m1",
      "accepted",
    );
    const apply = applyCall(accepted.clientQuery.mock.calls);
    expect(apply).toBeDefined();
    expect(JSON.parse((apply as unknown[][])[1][1] as string)).toEqual({
      note: "side door",
    });

    const declined = harness();
    declined.clientQuery
      .mockResolvedValueOnce(result([bookingRow({ state: "confirmed" })]))
      .mockResolvedValueOnce(open("cust", { note: "x" }))
      .mockResolvedValue(result());
    declined.query
      .mockResolvedValueOnce(result([bookingRow()]))
      .mockResolvedValue(result());
    await declined.service.decideModification(
      vendorOwner,
      "b1",
      "m1",
      "declined",
    );
    expect(applyCall(declined.clientQuery.mock.calls)).toBeUndefined();
  });

  it("refuses a modification on a closed booking", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(
      result([bookingRow({ state: "closed" })]),
    );
    await expect(
      h.service.proposeModification(
        customer,
        "b1",
        Object.assign(new ProposeModificationDto(), { proposedTerms: {} }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe("BookingsService reads", () => {
  it("applies passed deadlines as system events before listing", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(result([{ id: "b9", capacity_id: null }])) // expired
      .mockResolvedValueOnce(result()) // its event
      .mockResolvedValueOnce(result([{ id: "b8" }])) // auto-closed
      .mockResolvedValueOnce(result()); // its event
    h.query.mockResolvedValue(result([]));
    await h.service.listForCustomer(customer);
    expect(h.clientQuery.mock.calls[0][0]).toContain(
      "response_due_at <= CURRENT_TIMESTAMP",
    );
    expect(h.clientQuery.mock.calls[1][0]).toContain("booking-deadlines");
    expect(h.clientQuery.mock.calls[2][0]).toContain(
      "confirmation_due_at <= CURRENT_TIMESTAMP",
    );
  });

  it("the vendor inbox is only for the vendor's owner", async () => {
    const h = harness();
    h.query.mockResolvedValueOnce(result([], 0));
    await expect(
      h.service.listForVendor(stranger, "v1"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("shows the customer's name to the vendor only", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValue(result());
    h.query
      .mockResolvedValueOnce(result([{}], 1)) // owns the vendor
      .mockResolvedValueOnce(result([bookingRow()]));
    const [forVendor] = await h.service.listForVendor(vendorOwner, "v1");
    expect(forVendor.customerName).toBe("Asha");

    const other = harness();
    other.clientQuery.mockResolvedValue(result());
    other.query.mockResolvedValue(result([bookingRow()]));
    const [forCustomer] = await other.service.listForCustomer(customer);
    expect(forCustomer.customerName).toBeNull();
  });

  it("surfaces overlapping bookings without cancelling any (F-BKG-07)", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValue(result());
    h.query
      .mockResolvedValueOnce(
        result([
          bookingRow({
            slot_start: new Date(future(2)),
            slot_end: new Date(future(3)),
            time_zone: IST,
          }),
        ]),
      ) // load
      .mockResolvedValueOnce(result()) // events
      .mockResolvedValueOnce(result()) // modification
      .mockResolvedValueOnce(result()) // snapshot
      .mockResolvedValueOnce(result([{ id: "b2" }])); // conflicts
    const detail = await h.service.get(customer, "b1");
    expect(detail.conflictingBookingIds).toEqual(["b2"]);
    expect(usesSql(h.clientQuery.mock.calls, "state = 'cancelled'")).toBe(
      false,
    );
  });
});
