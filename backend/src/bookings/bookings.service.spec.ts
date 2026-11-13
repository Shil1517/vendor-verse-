import { BadRequestException } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { OutboxService } from "../platform/outbox.service";
import { BookingsService } from "./bookings.service";

const user: AuthenticatedUser = { userId: "customer-1", sessionId: "session-1" };
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
    service: new BookingsService(
      database,
      { record } as unknown as AuditService,
      { enqueue } as unknown as OutboxService,
    ),
    query,
    clientQuery,
    record,
    enqueue,
  };
}

describe("BookingsService", () => {
  it("requires an idempotency key before creating a booking", async () => {
    const h = harness();
    await expect(
      h.service.create(user, {
        listingId: "listing-1",
        mode: "scheduled",
        slotStart: "2099-01-01T10:00:00.000Z",
        slotEnd: "2099-01-01T11:00:00.000Z",
        timeZone: "Asia/Kolkata",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(h.clientQuery).not.toHaveBeenCalled();
  });

  it("creates a scheduled booking with its configured deadline and capacity check", async () => {
    const h = harness();
    const start = "2099-01-01T10:00:00.000Z";
    const end = "2099-01-01T11:00:00.000Z";
    h.clientQuery
      .mockResolvedValueOnce(
        result([
          {
            id: "listing-1",
            vendor_id: "vendor-1",
            category_id: "category-1",
            config_version_number: 1,
            title: "Repair service",
            price_min_minor: "5000",
            price_currency: "INR",
            time_zone: "Asia/Kolkata",
            instant_booking_enabled: false,
            content_state: "approved",
            owner_user_id: "vendor-owner",
            account_status: "active",
            configuration: { responseDeadlineSeconds: 3600 },
          },
        ]),
      )
      .mockResolvedValueOnce(result([{ id: "capacity-1" }]))
      .mockResolvedValueOnce(result([{ id: "booking-1" }]))
      .mockResolvedValueOnce(result([{ id: "snapshot-1" }]))
      .mockResolvedValueOnce(result());
    h.query.mockResolvedValueOnce(
      result([
        {
          id: "booking-1",
          customer_user_id: user.userId,
          vendor_id: "vendor-1",
          listing_id: "listing-1",
          booking_mode: "scheduled",
          series_id: null,
          occurrence_number: null,
          accepted_terms_snapshot_id: null,
          state: "requested",
          requested_terms: {},
          slot_start: new Date(start),
          slot_end: new Date(end),
          time_zone: "Asia/Kolkata",
          response_due_at: new Date("2099-01-01T12:00:00.000Z"),
          capacity_id: "capacity-1",
          decline_reason: null,
          cancellation_reason: null,
          created_at: new Date("2098-01-01T00:00:00.000Z"),
          updated_at: new Date("2098-01-01T00:00:00.000Z"),
        },
      ]),
    );

    const booking = await h.service.create(
      user,
      {
        listingId: "listing-1",
        mode: "scheduled",
        slotStart: start,
        slotEnd: end,
        timeZone: "Asia/Kolkata",
        capacityId: "capacity-1",
      },
      "request-1",
    );

    expect(booking).toMatchObject({
      id: "booking-1",
      state: "requested",
      capacityId: "capacity-1",
      timeZone: "Asia/Kolkata",
    });
    expect(h.clientQuery.mock.calls[1][0]).toContain("availability_capacity");
    expect(h.clientQuery.mock.calls[2][0]).toContain("response_due_at");
    expect(h.clientQuery.mock.calls[3][0]).toContain("booking_events");
    expect(h.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "booking.create" }),
      expect.anything(),
    );
  });
});
