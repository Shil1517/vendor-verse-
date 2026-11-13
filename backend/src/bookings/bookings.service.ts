import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PoolClient } from "pg";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { LISTING_ELIGIBLE_JOINS, LISTING_ELIGIBLE_SQL } from "../discover/listing-eligibility";
import { NotificationsService } from "../notifications/notifications.service";
import { AuditService } from "../platform/audit.service";
import {
  BookingState,
  CancelBookingDto,
  CreateBookingDto,
  DeclineBookingDto,
  ProposeModificationDto,
} from "./dto/booking.dto";

/** Customer confirmation window after completion (F-BKG-06). */
export const CONFIRMATION_WINDOW_DAYS = 7;

export type BookingAction =
  | "accept"
  | "decline"
  | "start"
  | "complete"
  | "confirm"
  | "cancel";

type Party = "customer" | "vendor";

/** Who may do what, and where each action starts and ends (F-BKG-01, F-BKG-09). */
const TRANSITIONS: Record<
  BookingAction,
  { by: Party[]; from: BookingState[]; to: BookingState }
> = {
  accept: { by: ["vendor"], from: ["requested"], to: "confirmed" },
  decline: { by: ["vendor"], from: ["requested"], to: "declined" },
  start: { by: ["vendor"], from: ["confirmed"], to: "in_progress" },
  complete: {
    by: ["vendor"],
    from: ["confirmed", "in_progress"],
    to: "completed_awaiting",
  },
  confirm: { by: ["customer"], from: ["completed_awaiting"], to: "closed" },
  cancel: {
    by: ["customer", "vendor"],
    from: ["requested", "confirmed"],
    to: "cancelled",
  },
};

export interface BookingSummary {
  id: string;
  viewerRole: Party;
  listingId: string;
  listingTitle: string;
  vendorId: string;
  vendorName: string;
  /** Shown to the vendor only. */
  customerName: string | null;
  mode: "instant" | "scheduled";
  state: BookingState;
  slotStart: string | null;
  slotEnd: string | null;
  timeZone: string | null;
  responseDueAt: string | null;
  confirmationDueAt: string | null;
  seriesId: string | null;
  occurrenceNumber: number | null;
  requestedTerms: Record<string, unknown>;
  declineReason: string | null;
  cancellationReason: string | null;
  cancelledBy: Party | null;
  createdAt: string;
  updatedAt: string;
}

interface BookingRow {
  id: string;
  customer_user_id: string;
  vendor_owner_id: string;
  listing_id: string;
  listing_title: string;
  vendor_id: string;
  vendor_name: string | null;
  customer_name: string | null;
  booking_mode: "instant" | "scheduled";
  state: BookingState;
  slot_start: Date | null;
  slot_end: Date | null;
  time_zone: string | null;
  response_due_at: Date | null;
  confirmation_due_at: Date | null;
  series_id: string | null;
  occurrence_number: number | null;
  requested_terms: Record<string, unknown>;
  decline_reason: string | null;
  cancellation_reason: string | null;
  cancelled_by_user_id: string | null;
  capacity_id: string | null;
  created_at: Date;
  updated_at: Date;
}

const BOOKING_SELECT = `
  SELECT b.id, b.customer_user_id, v.owner_user_id AS vendor_owner_id,
         b.listing_id, l.title AS listing_title, b.vendor_id,
         COALESCE(vp.trading_name, v.legal_name) AS vendor_name,
         cp.display_name AS customer_name,
         b.booking_mode, b.state, b.slot_start, b.slot_end, b.time_zone,
         b.response_due_at, b.confirmation_due_at, b.series_id,
         b.occurrence_number, b.requested_terms, b.decline_reason,
         b.cancellation_reason, b.cancelled_by_user_id, b.capacity_id,
         b.created_at, b.updated_at
  FROM bookings AS b
  JOIN listings AS l ON l.id = b.listing_id
  JOIN vendors AS v ON v.id = b.vendor_id
  LEFT JOIN vendor_profiles AS vp ON vp.vendor_id = v.id
  LEFT JOIN customer_profiles AS cp ON cp.user_id = b.customer_user_id`;

const UNIQUE_VIOLATION = "23505";
const EXCLUSION_VIOLATION = "23P01";

const partyOf = (row: BookingRow, userId: string): Party | null =>
  row.customer_user_id === userId
    ? "customer"
    : row.vendor_owner_id === userId
      ? "vendor"
      : null;

function toSummary(row: BookingRow, party: Party): BookingSummary {
  return {
    id: row.id,
    viewerRole: party,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name ?? "",
    customerName: party === "vendor" ? row.customer_name : null,
    mode: row.booking_mode,
    state: row.state,
    slotStart: row.slot_start?.toISOString() ?? null,
    slotEnd: row.slot_end?.toISOString() ?? null,
    timeZone: row.time_zone,
    responseDueAt: row.response_due_at?.toISOString() ?? null,
    confirmationDueAt: row.confirmation_due_at?.toISOString() ?? null,
    seriesId: row.series_id,
    occurrenceNumber: row.occurrence_number,
    requestedTerms: row.requested_terms,
    declineReason: row.decline_reason,
    cancellationReason: row.cancellation_reason,
    cancelledBy: row.cancelled_by_user_id
      ? row.cancelled_by_user_id === row.customer_user_id
        ? "customer"
        : "vendor"
      : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * Bookings: F-BKG-01 to F-BKG-10. The customer creates; the vendor owner
 * responds. Every state change is one transaction that locks the booking row,
 * checks the actor and the starting state, writes an immutable booking_events
 * row and raises a notification, so a retry or a race cannot skip a state.
 *
 * Deadlines (response deadline, 7-day confirmation) are applied lazily when a
 * booking is read, as system events. A scheduler worker will replace this; the
 * outcome is the same.
 */
@Injectable()
export class BookingsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /* ------------------------------------------------------------------ create */

  async create(
    user: AuthenticatedUser,
    request: CreateBookingDto,
    idempotencyKey?: string,
  ): Promise<{ bookings: BookingSummary[] }> {
    const mode = request.mode ?? "scheduled";
    if (request.recurrence && mode === "instant") {
      throw new BadRequestException("A recurring series cannot be instant");
    }
    if (request.recurrence && !request.timeZone) {
      throw new BadRequestException("timeZone is required for a series");
    }
    if (mode === "instant" && !request.slotStart) {
      throw new BadRequestException("An instant booking needs a slot");
    }
    const slots = request.recurrence
      ? request.recurrence.occurrences
      : [
          request.slotStart && request.slotEnd
            ? { slotStart: request.slotStart, slotEnd: request.slotEnd }
            : null,
        ];
    for (const slot of slots) {
      if (slot && new Date(slot.slotEnd) <= new Date(slot.slotStart)) {
        throw new BadRequestException("slotEnd must be after slotStart");
      }
      if (slot && new Date(slot.slotStart) <= new Date()) {
        throw new BadRequestException("A slot must be in the future");
      }
    }

    try {
      const ids = await this.database.transaction(async (client) => {
        const listing = await this.loadBookableListing(
          client,
          request.listingId,
        );
        if (listing.owner_user_id === user.userId) {
          throw new ForbiddenException(
            "You cannot book your own listing; switch to a different account",
          );
        }
        if (mode === "instant" && !listing.instant_booking_enabled) {
          throw new BadRequestException(
            "This listing does not offer instant booking",
          );
        }

        let seriesId: string | null = null;
        if (request.recurrence) {
          const series = await client.query<{ id: string }>(
            `INSERT INTO booking_series
               (customer_user_id, vendor_id, listing_id, recurrence_rule, time_zone)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [
              user.userId,
              listing.vendor_id,
              listing.id,
              request.recurrence.rule,
              request.timeZone as string,
            ],
          );
          seriesId = series.rows[0].id;
        }

        const created: string[] = [];
        for (const [index, slot] of slots.entries()) {
          // One key per occurrence so a retried series is still one series.
          const key = idempotencyKey
            ? slots.length > 1
              ? `${idempotencyKey}#${index + 1}`
              : idempotencyKey
            : null;
          const id = await this.insertBooking(client, {
            user,
            listing,
            mode,
            slot,
            timeZone: request.timeZone ?? listing.time_zone,
            requestedTerms: request.requestedTerms ?? {},
            seriesId,
            occurrenceNumber: seriesId ? index + 1 : null,
            idempotencyKey: key,
          });
          created.push(id);
        }
        return created;
      });
      return {
        bookings: await Promise.all(ids.map((id) => this.summary(user, id))),
      };
    } catch (error) {
      throw this.translate(error);
    }
  }

  private async loadBookableListing(client: PoolClient, listingId: string) {
    const result = await client.query<{
      id: string;
      vendor_id: string;
      owner_user_id: string;
      category_id: string;
      config_version_number: number;
      instant_booking_enabled: boolean;
      time_zone: string | null;
      title: string;
      price_on_request: boolean;
      price_min_minor: string | null;
      price_max_minor: string | null;
      price_currency: string | null;
      price_unit: string | null;
      configuration: Record<string, unknown> | null;
    }>(
      `SELECT l.id, l.vendor_id, v.owner_user_id, l.category_id,
              l.config_version_number, l.instant_booking_enabled, l.time_zone,
              l.title, l.price_on_request, l.price_min_minor,
              l.price_max_minor, l.price_currency, l.price_unit,
              cfg.configuration
       ${LISTING_ELIGIBLE_JOINS}
       WHERE l.id = $1 AND ${LISTING_ELIGIBLE_SQL}`,
      [listingId],
    );
    const listing = result.rows[0];
    if (!listing) {
      throw new NotFoundException("No such bookable listing");
    }
    return listing;
  }

  private async insertBooking(
    client: PoolClient,
    input: {
      user: AuthenticatedUser;
      listing: Awaited<ReturnType<BookingsService["loadBookableListing"]>>;
      mode: "instant" | "scheduled";
      slot: { slotStart: string; slotEnd: string } | null;
      timeZone: string | null;
      requestedTerms: Record<string, unknown>;
      seriesId: string | null;
      occurrenceNumber: number | null;
      idempotencyKey: string | null;
    },
  ): Promise<string> {
    const { user, listing, mode, slot } = input;
    if (slot && !input.timeZone) {
      throw new BadRequestException("timeZone is required with a slot");
    }

    // Instant: take capacity atomically; the conditional UPDATE allocates the
    // last slot exactly once (SC-013).
    let capacityId: string | null = null;
    if (mode === "instant" && slot) {
      const reserved = await client.query<{ id: string }>(
        `UPDATE availability_capacity
         SET reserved = reserved + 1
         WHERE listing_id = $1 AND starts_at <= $2 AND ends_at >= $3
           AND reserved < capacity
         RETURNING id`,
        [listing.id, slot.slotStart, slot.slotEnd],
      );
      capacityId = reserved.rows[0]?.id ?? null;
      if (!capacityId) {
        throw new ConflictException(
          "That slot is no longer available. Choose another time.",
        );
      }
    }

    // The response deadline is category configuration; with none set there is
    // no deadline and no auto-expiry (no value is invented here).
    const hours = Number(listing.configuration?.responseDeadlineHours);
    const responseDue =
      mode === "scheduled" && Number.isFinite(hours) && hours > 0
        ? new Date(Date.now() + hours * 3_600_000)
        : null;
    const state: BookingState = mode === "instant" ? "confirmed" : "requested";

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO bookings
         (customer_user_id, vendor_id, listing_id, booking_mode, series_id,
          occurrence_number, state, requested_terms, slot_start, slot_end,
          time_zone, response_due_at, capacity_id, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (customer_user_id, idempotency_key)
         WHERE idempotency_key IS NOT NULL DO NOTHING
       RETURNING id`,
      [
        user.userId,
        listing.vendor_id,
        listing.id,
        mode,
        input.seriesId,
        input.occurrenceNumber,
        state,
        JSON.stringify(input.requestedTerms),
        slot?.slotStart ?? null,
        slot?.slotEnd ?? null,
        slot ? input.timeZone : null,
        responseDue,
        capacityId,
        input.idempotencyKey,
      ],
    );
    const id = inserted.rows[0]?.id;
    if (!id) {
      // A retried create: hand back the booking the first request made, and
      // give back the capacity this attempt took.
      if (capacityId) {
        await client.query(
          `UPDATE availability_capacity SET reserved = reserved - 1 WHERE id = $1`,
          [capacityId],
        );
      }
      const existing = await client.query<{ id: string }>(
        `SELECT id FROM bookings
         WHERE customer_user_id = $1 AND idempotency_key = $2`,
        [user.userId, input.idempotencyKey],
      );
      return existing.rows[0].id;
    }

    // Terms and policy as they stood at booking time; immutable (F-BKG-01).
    await client.query(
      `INSERT INTO booking_terms_snapshots
         (booking_id, category_id, category_config_version, terms, policy_snapshot)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)`,
      [
        id,
        listing.category_id,
        listing.config_version_number,
        JSON.stringify({
          listingTitle: listing.title,
          requested: input.requestedTerms,
          price: {
            onRequest: listing.price_on_request,
            minMinor:
              listing.price_min_minor === null
                ? null
                : Number(listing.price_min_minor),
            maxMinor:
              listing.price_max_minor === null
                ? null
                : Number(listing.price_max_minor),
            currency: listing.price_currency,
            unit: listing.price_unit,
          },
        }),
        JSON.stringify({
          cancellationPolicyId:
            listing.configuration?.cancellationPolicyId ?? null,
          responseDeadlineHours: Number.isFinite(hours) ? hours : null,
        }),
      ],
    );
    await this.event(client, id, user.userId, "created", null, state, {
      mode,
    });
    await this.audit.record(
      {
        actorUserId: user.userId,
        action: "booking.create",
        targetType: "booking",
        targetId: id,
        metadata: { listingId: listing.id, mode },
      },
      client,
    );
    await this.notifications.notify(
      {
        recipientUserId: listing.owner_user_id,
        eventType:
          mode === "instant" ? "booking.confirmed_instant" : "booking.requested",
        category: "bookings",
        dedupeKey: `booking:${id}:created`,
        payload: { listingTitle: listing.title },
        linkedResource: { type: "booking", id },
      },
      client,
    );
    return id;
  }

  /* -------------------------------------------------------------------- read */

  /** The caller's own bookings as a customer, newest first (F-BKG-10). */
  async listForCustomer(
    user: AuthenticatedUser,
    state?: BookingState,
  ): Promise<BookingSummary[]> {
    await this.applyDeadlines(
      `b.customer_user_id = $1`,
      [user.userId],
    );
    const result = await this.database.query<BookingRow>(
      `${BOOKING_SELECT}
       WHERE b.customer_user_id = $1 AND ($2::text IS NULL OR b.state = $2)
       ORDER BY b.created_at DESC, b.id`,
      [user.userId, state ?? null],
    );
    return result.rows.map((row) => toSummary(row, "customer"));
  }

  /** A vendor's inbox: only its own bookings, never competing requests (F-BKG-08, F-BKG-09). */
  async listForVendor(
    user: AuthenticatedUser,
    vendorId: string,
    state?: BookingState,
  ): Promise<BookingSummary[]> {
    const owned = await this.database.query(
      `SELECT 1 FROM vendors WHERE id = $1 AND owner_user_id = $2`,
      [vendorId, user.userId],
    );
    if (owned.rowCount !== 1) {
      throw new NotFoundException("No such vendor for this user");
    }
    await this.applyDeadlines(`b.vendor_id = $1`, [vendorId]);
    const result = await this.database.query<BookingRow>(
      `${BOOKING_SELECT}
       WHERE b.vendor_id = $1 AND b.state <> 'draft'
         AND ($2::text IS NULL OR b.state = $2)
       ORDER BY b.created_at DESC, b.id`,
      [vendorId, state ?? null],
    );
    return result.rows.map((row) => toSummary(row, "vendor"));
  }

  async get(user: AuthenticatedUser, bookingId: string) {
    await this.applyDeadlines(`b.id = $1`, [bookingId]);
    const row = await this.load(this.database, bookingId);
    const party = partyOf(row, user.userId);
    if (!party) {
      throw new NotFoundException("No such booking");
    }
    const [events, modification, snapshot, conflicts] = await Promise.all([
      this.database.query<{
        event_type: string;
        from_state: string | null;
        to_state: string | null;
        details: Record<string, unknown>;
        occurred_at: Date;
        actor_user_id: string | null;
      }>(
        `SELECT event_type, from_state, to_state, details, occurred_at, actor_user_id
         FROM booking_events WHERE booking_id = $1 ORDER BY occurred_at, id`,
        [bookingId],
      ),
      this.database.query<{
        id: string;
        proposed_terms: Record<string, unknown>;
        created_by_user_id: string;
        created_at: Date;
      }>(
        `SELECT id, proposed_terms, created_by_user_id, created_at
         FROM booking_modifications
         WHERE booking_id = $1 AND state = 'proposed'`,
        [bookingId],
      ),
      this.database.query<{
        terms: Record<string, unknown>;
        policy_snapshot: Record<string, unknown>;
        category_config_version: number;
        captured_at: Date;
      }>(
        `SELECT terms, policy_snapshot, category_config_version, captured_at
         FROM booking_terms_snapshots WHERE booking_id = $1`,
        [bookingId],
      ),
      // F-BKG-07: surface overlapping bookings; the customer chooses, nothing auto-cancels.
      row.slot_start && row.slot_end && party === "customer"
        ? this.database.query<{ id: string }>(
            `SELECT id FROM bookings
             WHERE customer_user_id = $1 AND id <> $2
               AND state IN ('requested', 'confirmed', 'in_progress')
               AND slot_start < $4 AND slot_end > $3`,
            [user.userId, bookingId, row.slot_start, row.slot_end],
          )
        : Promise.resolve({ rows: [] as { id: string }[] }),
    ]);
    const open = modification.rows[0];
    return {
      ...toSummary(row, party),
      termsSnapshot: snapshot.rows[0]
        ? {
            terms: snapshot.rows[0].terms,
            policy: snapshot.rows[0].policy_snapshot,
            categoryConfigVersion: snapshot.rows[0].category_config_version,
            capturedAt: snapshot.rows[0].captured_at.toISOString(),
          }
        : null,
      openModification: open
        ? {
            id: open.id,
            proposedTerms: open.proposed_terms,
            proposedBy:
              open.created_by_user_id === row.customer_user_id
                ? ("customer" as const)
                : ("vendor" as const),
            createdAt: open.created_at.toISOString(),
          }
        : null,
      conflictingBookingIds: conflicts.rows.map((c) => c.id),
      events: events.rows.map((e) => ({
        type: e.event_type,
        fromState: e.from_state,
        toState: e.to_state,
        details: e.details,
        occurredAt: e.occurred_at.toISOString(),
        byCustomer: e.actor_user_id === row.customer_user_id,
      })),
    };
  }

  /* ------------------------------------------------------------ transitions */

  async transition(
    user: AuthenticatedUser,
    bookingId: string,
    action: BookingAction,
    options: { reason?: string; cancelSeries?: boolean } = {},
  ): Promise<BookingSummary> {
    const rule = TRANSITIONS[action];
    try {
      await this.database.transaction(async (client) => {
        const row = await this.load(client, bookingId, true);
        const party = partyOf(row, user.userId);
        if (!party) {
          throw new NotFoundException("No such booking");
        }
        if (!rule.by.includes(party)) {
          throw new ForbiddenException(`Only the ${rule.by.join(" or ")} can ${action} a booking`);
        }
        if (!rule.from.includes(row.state)) {
          throw new ConflictException(
            `A ${row.state} booking cannot be ${action}ed`,
          );
        }

        const sets: string[] = ["state = $2"];
        const values: Array<string | Date | null> = [bookingId, rule.to];
        const set = (column: string, value: string | Date | null) => {
          values.push(value);
          sets.push(`${column} = $${values.length}`);
        };
        if (action === "decline") set("decline_reason", options.reason ?? null);
        if (action === "cancel") {
          set("cancelled_by_user_id", user.userId);
          set("cancellation_reason", options.reason ?? null);
          sets.push("cancelled_at = CURRENT_TIMESTAMP");
        }
        if (action === "complete") {
          sets.push("completed_at = CURRENT_TIMESTAMP");
          set(
            "confirmation_due_at",
            new Date(Date.now() + CONFIRMATION_WINDOW_DAYS * 86_400_000),
          );
        }
        if (action === "confirm") sets.push("closed_at = CURRENT_TIMESTAMP");

        await client.query(
          `UPDATE bookings SET ${sets.join(", ")} WHERE id = $1`,
          values,
        );
        if ((action === "cancel" || action === "decline") && row.capacity_id) {
          await client.query(
            `UPDATE availability_capacity
             SET reserved = GREATEST(reserved - 1, 0) WHERE id = $1`,
            [row.capacity_id],
          );
        }

        // D-011: cancelling one occurrence leaves the series alone unless the
        // customer chooses to cancel the rest too.
        let alsoCancelled: string[] = [];
        if (
          action === "cancel" &&
          party === "customer" &&
          options.cancelSeries &&
          row.series_id
        ) {
          const rest = await client.query<{ id: string; capacity_id: string | null }>(
            `UPDATE bookings
             SET state = 'cancelled', cancelled_by_user_id = $2,
                 cancellation_reason = $3, cancelled_at = CURRENT_TIMESTAMP
             WHERE series_id = $1 AND id <> $4
               AND state IN ('requested', 'confirmed')
               AND occurrence_number > $5
             RETURNING id, capacity_id`,
            [
              row.series_id,
              user.userId,
              options.reason ?? null,
              bookingId,
              row.occurrence_number,
            ],
          );
          alsoCancelled = rest.rows.map((r) => r.id);
          for (const r of rest.rows) {
            await this.event(client, r.id, user.userId, "series_cancelled", "open", "cancelled", {});
          }
          await client.query(
            `UPDATE booking_series SET state = 'cancelled'
             WHERE id = $1 AND NOT EXISTS (
               SELECT 1 FROM bookings WHERE series_id = $1
                 AND state IN ('requested', 'confirmed', 'in_progress'))`,
            [row.series_id],
          );
        }

        await this.event(client, bookingId, user.userId, action, row.state, rule.to, {
          ...(options.reason ? { reason: options.reason } : {}),
          ...(alsoCancelled.length ? { alsoCancelled } : {}),
        });
        await this.audit.record(
          {
            actorUserId: user.userId,
            actorRole: party,
            action: `booking.${action}`,
            targetType: "booking",
            targetId: bookingId,
            reason: options.reason,
          },
          client,
        );
        await this.notifications.notify(
          {
            recipientUserId:
              party === "vendor" ? row.customer_user_id : row.vendor_owner_id,
            eventType: `booking.${rule.to}`,
            category: "bookings",
            dedupeKey: `booking:${bookingId}:${rule.to}`,
            payload: { listingTitle: row.listing_title },
            linkedResource: { type: "booking", id: bookingId },
          },
          client,
        );
      });
      return await this.summary(user, bookingId);
    } catch (error) {
      throw this.translate(error);
    }
  }

  decline(user: AuthenticatedUser, bookingId: string, dto: DeclineBookingDto) {
    return this.transition(user, bookingId, "decline", { reason: dto.reason });
  }

  cancel(user: AuthenticatedUser, bookingId: string, dto: CancelBookingDto) {
    return this.transition(user, bookingId, "cancel", {
      reason: dto.reason,
      cancelSeries: dto.cancelSeries,
    });
  }

  /* ------------------------------------------------------------ modification */

  /** F-BKG-04. Either side proposes; the other decides; terms change only on accept. */
  async proposeModification(
    user: AuthenticatedUser,
    bookingId: string,
    request: ProposeModificationDto,
  ) {
    if (
      request.slotStart &&
      request.slotEnd &&
      new Date(request.slotEnd) <= new Date(request.slotStart)
    ) {
      throw new BadRequestException("slotEnd must be after slotStart");
    }
    try {
      await this.database.transaction(async (client) => {
        const row = await this.load(client, bookingId, true);
        const party = this.requireParty(row, user.userId);
        if (row.state !== "requested" && row.state !== "confirmed") {
          throw new ConflictException(
            `A ${row.state} booking cannot be modified`,
          );
        }
        const proposed = {
          ...request.proposedTerms,
          ...(request.slotStart
            ? {
                slot: {
                  slotStart: request.slotStart,
                  slotEnd: request.slotEnd,
                  timeZone: request.timeZone,
                },
              }
            : {}),
        };
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO booking_modifications
             (booking_id, proposed_terms, created_by_user_id)
           VALUES ($1, $2::jsonb, $3) RETURNING id`,
          [bookingId, JSON.stringify(proposed), user.userId],
        );
        await this.event(client, bookingId, user.userId, "modification_proposed", row.state, row.state, {
          modificationId: inserted.rows[0].id,
        });
        await this.notifications.notify(
          {
            recipientUserId:
              party === "vendor" ? row.customer_user_id : row.vendor_owner_id,
            eventType: "booking.modification_proposed",
            category: "bookings",
            dedupeKey: `booking:${bookingId}:mod:${inserted.rows[0].id}`,
            payload: { listingTitle: row.listing_title },
            linkedResource: { type: "booking", id: bookingId },
          },
          client,
        );
      });
      return await this.get(user, bookingId);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async decideModification(
    user: AuthenticatedUser,
    bookingId: string,
    modificationId: string,
    decision: "accepted" | "declined" | "withdrawn",
  ) {
    try {
      await this.database.transaction(async (client) => {
        const row = await this.load(client, bookingId, true);
        const party = this.requireParty(row, user.userId);
        const mod = await client.query<{
          proposed_terms: Record<string, unknown>;
          created_by_user_id: string;
        }>(
          `SELECT proposed_terms, created_by_user_id FROM booking_modifications
           WHERE id = $1 AND booking_id = $2 AND state = 'proposed'
           FOR UPDATE`,
          [modificationId, bookingId],
        );
        const proposal = mod.rows[0];
        if (!proposal) {
          throw new ConflictException("There is no open proposal with that id");
        }
        const mine = proposal.created_by_user_id === user.userId;
        if (decision === "withdrawn" ? !mine : mine) {
          throw new ForbiddenException(
            decision === "withdrawn"
              ? "Only the proposer can withdraw"
              : "The other side decides on a proposal",
          );
        }
        if (row.state !== "requested" && row.state !== "confirmed") {
          throw new ConflictException(`A ${row.state} booking cannot be modified`);
        }
        await client.query(
          `UPDATE booking_modifications
           SET state = $2, decided_by_user_id = $3, decided_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [modificationId, decision, user.userId],
        );
        if (decision === "accepted") {
          const { slot, ...terms } = proposal.proposed_terms as {
            slot?: { slotStart: string; slotEnd: string; timeZone: string };
            [key: string]: unknown;
          };
          await client.query(
            `UPDATE bookings
             SET requested_terms = requested_terms || $2::jsonb,
                 slot_start = COALESCE($3, slot_start),
                 slot_end = COALESCE($4, slot_end),
                 time_zone = COALESCE($5, time_zone)
             WHERE id = $1`,
            [
              bookingId,
              JSON.stringify(terms),
              slot?.slotStart ?? null,
              slot?.slotEnd ?? null,
              slot?.timeZone ?? null,
            ],
          );
        }
        await this.event(client, bookingId, user.userId, `modification_${decision}`, row.state, row.state, {
          modificationId,
        });
        await this.notifications.notify(
          {
            recipientUserId:
              party === "vendor" ? row.customer_user_id : row.vendor_owner_id,
            eventType: `booking.modification_${decision}`,
            category: "bookings",
            dedupeKey: `booking:${bookingId}:mod:${modificationId}:${decision}`,
            payload: { listingTitle: row.listing_title },
            linkedResource: { type: "booking", id: bookingId },
          },
          client,
        );
      });
      return await this.get(user, bookingId);
    } catch (error) {
      throw this.translate(error);
    }
  }

  /* ---------------------------------------------------------------- helpers */

  /**
   * System transitions for deadlines that have passed, applied to the bookings
   * a read is about to return: a requested booking past its response deadline
   * expires, and a completed one past its 7-day window closes (F-BKG-01,
   * F-BKG-06). Capacity of an expired instant booking is given back.
   */
  private async applyDeadlines(
    scope: string,
    values: string[],
  ): Promise<void> {
    await this.database.transaction(async (client) => {
      const expired = await client.query<{ id: string; capacity_id: string | null }>(
        `UPDATE bookings AS b SET state = 'expired'
         WHERE ${scope} AND b.state = 'requested'
           AND b.response_due_at IS NOT NULL
           AND b.response_due_at <= CURRENT_TIMESTAMP
         RETURNING b.id, b.capacity_id`,
        values,
      );
      for (const row of expired.rows) {
        await this.systemEvent(client, row.id, "expired", "requested", "expired");
      }
      const closed = await client.query<{ id: string }>(
        `UPDATE bookings AS b
         SET state = 'closed', closed_at = CURRENT_TIMESTAMP
         WHERE ${scope} AND b.state = 'completed_awaiting'
           AND b.confirmation_due_at IS NOT NULL
           AND b.confirmation_due_at <= CURRENT_TIMESTAMP
         RETURNING b.id`,
        values,
      );
      for (const row of closed.rows) {
        await this.systemEvent(client, row.id, "auto_closed", "completed_awaiting", "closed");
      }
    });
  }

  private requireParty(row: BookingRow, userId: string): Party {
    const party = partyOf(row, userId);
    if (!party) {
      throw new NotFoundException("No such booking");
    }
    return party;
  }

  private async load(
    runner: Pick<DatabaseService, "query"> | PoolClient,
    bookingId: string,
    lock = false,
  ): Promise<BookingRow> {
    const result = await (runner as Pick<DatabaseService, "query">).query<BookingRow>(
      `${BOOKING_SELECT} WHERE b.id = $1${lock ? " FOR UPDATE OF b" : ""}`,
      [bookingId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("No such booking");
    }
    return row;
  }

  private async summary(
    user: AuthenticatedUser,
    bookingId: string,
  ): Promise<BookingSummary> {
    const row = await this.load(this.database, bookingId);
    return toSummary(row, this.requireParty(row, user.userId));
  }

  private event(
    client: PoolClient,
    bookingId: string,
    actorUserId: string,
    type: string,
    from: string | null,
    to: string | null,
    details: Record<string, unknown>,
  ) {
    return client.query(
      `INSERT INTO booking_events
         (booking_id, actor_user_id, event_type, from_state, to_state, details)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [bookingId, actorUserId, type, from, to, JSON.stringify(details)],
    );
  }

  private systemEvent(
    client: PoolClient,
    bookingId: string,
    type: string,
    from: string,
    to: string,
  ) {
    return client.query(
      `INSERT INTO booking_events
         (booking_id, actor_service, event_type, from_state, to_state)
       VALUES ($1, 'booking-deadlines', $2, $3, $4)`,
      [bookingId, type, from, to],
    );
  }

  private translate(error: unknown): unknown {
    const code = (error as { code?: string }).code;
    if (code === UNIQUE_VIOLATION) {
      return new ConflictException("That change conflicts with an existing record");
    }
    if (code === EXCLUSION_VIOLATION) {
      return new ConflictException("That time overlaps an existing window");
    }
    if (code === "23514") {
      return new BadRequestException("The booking details are inconsistent");
    }
    return error;
  }
}
