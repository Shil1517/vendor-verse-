import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { QueryResult, QueryResultRow, PoolClient } from "pg";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { OutboxService } from "../platform/outbox.service";
import {
  BookingActionDto,
  CancelBookingDto,
  CreateBookingDto,
  CreateBookingSeriesDto,
  DecideBookingModificationDto,
  ProposeBookingModificationDto,
  ReportBookingCompletionDto,
  ResolveBookingConflictsDto,
} from "./dto/booking.dto";

interface Queryable {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
}

interface ListingContext {
  id: string;
  vendor_id: string;
  category_id: string;
  config_version_number: number;
  title: string;
  price_min_minor: string | null;
  price_currency: string | null;
  time_zone: string | null;
  instant_booking_enabled: boolean;
  content_state: string;
  owner_user_id: string;
  account_status: string;
  configuration: Record<string, unknown>;
}

interface BookingRow extends QueryResultRow {
  id: string;
  customer_user_id: string;
  vendor_id: string;
  listing_id: string;
  booking_mode: string;
  series_id: string | null;
  occurrence_number: number | null;
  accepted_terms_snapshot_id: string | null;
  state: string;
  requested_terms: Record<string, unknown>;
  slot_start: Date;
  slot_end: Date;
  time_zone: string;
  response_due_at: Date | null;
  capacity_id: string | null;
  decline_reason: string | null;
  cancellation_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

const BOOKING_SELECT = `SELECT id, customer_user_id, vendor_id, listing_id,
  booking_mode, series_id, occurrence_number, accepted_terms_snapshot_id,
  state, requested_terms, slot_start, slot_end, time_zone, response_due_at,
  capacity_id, decline_reason, cancellation_reason, created_at, updated_at
  FROM bookings`;

const toView = (row: BookingRow) => ({
  id: row.id,
  customerUserId: row.customer_user_id,
  vendorId: row.vendor_id,
  listingId: row.listing_id,
  mode: row.booking_mode,
  seriesId: row.series_id,
  occurrenceNumber: row.occurrence_number,
  acceptedTermsSnapshotId: row.accepted_terms_snapshot_id,
  state: row.state,
  requestedTerms: row.requested_terms,
  slotStart: row.slot_start,
  slotEnd: row.slot_end,
  timeZone: row.time_zone,
  responseDueAt: row.response_due_at,
  capacityId: row.capacity_id,
  declineReason: row.decline_reason,
  cancellationReason: row.cancellation_reason,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

@Injectable()
export class BookingsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  async createFromAcceptedTerms(
    client: PoolClient,
    accepted: {
      snapshotId: string;
      customerUserId: string;
      vendorId: string;
      listingId: string;
      terms: Record<string, unknown>;
    },
  ) {
    const timeline = accepted.terms.timeline;
    if (!timeline || typeof timeline !== "object" || Array.isArray(timeline)) {
      throw new ConflictException("The accepted service quote needs booking slot terms");
    }
    const schedule = timeline as Record<string, unknown>;
    const slotStart = this.requiredDate(schedule.slotStart, "slotStart");
    const slotEnd = this.requiredDate(schedule.slotEnd, "slotEnd");
    const timeZone = typeof schedule.timeZone === "string" ? schedule.timeZone : "";
    if (slotEnd <= slotStart || slotStart <= new Date() || !timeZone) {
      throw new BadRequestException("The accepted quote has invalid booking slot terms");
    }
    this.validateTimeZone(timeZone);
    const listing = await this.getListingContext(client, accepted.listingId);
    if (listing.vendor_id !== accepted.vendorId) {
      throw new ConflictException("The accepted quote vendor does not own the requested listing");
    }
    const capacityId = typeof schedule.capacityId === "string" ? schedule.capacityId : undefined;
    await this.reserveCapacity(client, listing.id, capacityId, slotStart, slotEnd);
    const created = await client.query<{ id: string }>(
      `INSERT INTO bookings
         (customer_user_id, vendor_id, listing_id, booking_mode,
          accepted_terms_snapshot_id, state, requested_terms, slot_start,
          slot_end, time_zone, capacity_id)
       VALUES ($1, $2, $3, 'scheduled', $4, 'confirmed', $5::jsonb,
               $6, $7, $8, $9)
       RETURNING id`,
      [
        accepted.customerUserId,
        accepted.vendorId,
        listing.id,
        accepted.snapshotId,
        JSON.stringify(accepted.terms),
        slotStart,
        slotEnd,
        timeZone,
        capacityId ?? null,
      ],
    );
    const bookingId = created.rows[0].id;
    await this.captureTerms(client, bookingId, listing, accepted.terms);
    await this.addEvent(client, bookingId, accepted.customerUserId, "booking.created_from_rfq", null, "confirmed");
    await this.recordChange(client, accepted.customerUserId, bookingId, "created_from_rfq", "confirmed");
    return bookingId;
  }

  async create(
    user: AuthenticatedUser,
    request: CreateBookingDto,
    idempotencyKey?: string,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException("Idempotency-Key is required");
    }
    const start = new Date(request.slotStart);
    const end = new Date(request.slotEnd);
    if (end <= start || start <= new Date()) {
      throw new BadRequestException("Booking slot must be a future, positive interval");
    }
    this.validateTimeZone(request.timeZone);
    const id = await this.database.transaction(async (client) => {
      const listing = await this.getListingContext(client, request.listingId);
      this.assertBookingRequest(listing, request.mode);
      const state = request.mode === "instant" ? "confirmed" : "requested";
      const responseDueAt =
        state === "requested"
          ? this.responseDeadline(listing.configuration)
          : null;
      if (!request.capacityId) {
        throw new BadRequestException("capacityId is required for a booking slot");
      }
      if (request.mode === "instant") {
        await this.reserveCapacity(client, listing.id, request.capacityId, start, end);
      } else {
        await this.assertCapacityWindow(client, listing.id, request.capacityId, start, end);
      }
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO bookings
           (customer_user_id, vendor_id, listing_id, booking_mode, state,
            requested_terms, slot_start, slot_end, time_zone, response_due_at,
            capacity_id, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [
          user.userId,
          listing.vendor_id,
          listing.id,
          request.mode,
          state,
          JSON.stringify(request.requestedTerms ?? {}),
          start,
          end,
          request.timeZone,
          responseDueAt,
          request.capacityId ?? null,
          idempotencyKey,
        ],
      );
      const bookingId = inserted.rows[0].id;
      if (state === "confirmed") {
        await this.captureTerms(client, bookingId, listing, request.requestedTerms ?? {});
      }
      await this.addEvent(client, bookingId, user.userId, "booking.created", null, state);
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "booking.create",
          targetType: "booking",
          targetId: bookingId,
          metadata: { listingId: listing.id, mode: request.mode },
        },
        client,
      );
      await this.outbox.enqueue(
        { aggregateType: "booking", aggregateId: bookingId, eventType: "booking.created" },
        client,
      );
      return bookingId;
    });
    return this.get(user, id);
  }

  async createSeries(
    user: AuthenticatedUser,
    request: CreateBookingSeriesDto,
    idempotencyKey?: string,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException("Idempotency-Key is required");
    }
    if (!request.occurrences.every((occurrence) => occurrence.slotStart && occurrence.slotEnd)) {
      throw new BadRequestException("Every occurrence needs a start and end");
    }
    const id = await this.database.transaction(async (client) => {
      const listing = await this.getListingContext(client, request.listingId);
      this.assertBookingRequest(listing, "scheduled");
      this.validateTimeZone(request.timeZone);
      const responseDueAt = this.responseDeadline(listing.configuration);
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO booking_series
           (customer_user_id, vendor_id, listing_id, recurrence_rule, time_zone)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [user.userId, listing.vendor_id, listing.id, request.recurrenceRule, request.timeZone],
      );
      const seriesId = inserted.rows[0].id;
      const ids: string[] = [];
      for (let index = 0; index < request.occurrences.length; index += 1) {
        const occurrence = request.occurrences[index];
        const start = new Date(occurrence.slotStart);
        const end = new Date(occurrence.slotEnd);
        if (start <= new Date() || end <= start) {
          throw new BadRequestException("Every occurrence must be a future, positive interval");
        }
        if (!occurrence.capacityId) {
          throw new BadRequestException("Every occurrence needs a capacityId");
        }
        await this.assertCapacityWindow(client, listing.id, occurrence.capacityId, start, end);
        const created = await client.query<{ id: string }>(
          `INSERT INTO bookings
             (customer_user_id, vendor_id, listing_id, booking_mode, series_id,
              occurrence_number, state, requested_terms, slot_start, slot_end,
              time_zone, response_due_at, capacity_id, idempotency_key)
           VALUES ($1, $2, $3, 'scheduled', $4, $5, 'requested', $6::jsonb,
                   $7, $8, $9, $10, $11, $12) RETURNING id`,
          [
            user.userId,
            listing.vendor_id,
            listing.id,
            seriesId,
            index + 1,
            JSON.stringify(request.requestedTerms ?? {}),
            start,
            end,
            request.timeZone,
            responseDueAt,
            occurrence.capacityId ?? null,
            `${idempotencyKey}:${index + 1}`,
          ],
        );
        const bookingId = created.rows[0].id;
        ids.push(bookingId);
        await this.addEvent(client, bookingId, user.userId, "booking.created", null, "requested");
      }
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "booking.series_create",
          targetType: "booking_series",
          targetId: seriesId,
          metadata: { occurrenceCount: ids.length },
        },
        client,
      );
      await this.outbox.enqueue(
        { aggregateType: "booking_series", aggregateId: seriesId, eventType: "booking.series_created" },
        client,
      );
      return ids;
    });
    return { bookings: await Promise.all(id.map((bookingId) => this.get(user, bookingId))) };
  }

  async listMine(user: AuthenticatedUser) {
    const result = await this.database.query<BookingRow>(
      `${BOOKING_SELECT} WHERE customer_user_id = $1 ORDER BY created_at DESC, id`,
      [user.userId],
    );
    return { bookings: result.rows.map(toView) };
  }

  async listForVendor(user: AuthenticatedUser, vendorId: string) {
    await this.requireVendorOwner(this.database, vendorId, user.userId);
    const result = await this.database.query(
      `${BOOKING_SELECT}
       WHERE vendor_id = $1 AND EXISTS (
         SELECT 1 FROM vendors WHERE id = $1 AND owner_user_id = $2
       )
       ORDER BY created_at DESC, id`,
      [vendorId, user.userId],
    );
    return { bookings: result.rows.map(toView) };
  }

  async get(user: AuthenticatedUser, bookingId: string) {
    const result = await this.database.query<BookingRow>(
      `${BOOKING_SELECT}
       WHERE id = $1 AND (
         customer_user_id = $2 OR EXISTS (
           SELECT 1 FROM vendors
           WHERE vendors.id = bookings.vendor_id AND owner_user_id = $2
         )
       )`,
      [bookingId, user.userId],
    );
    if (!result.rows[0]) throw new NotFoundException("No such booking");
    return toView(result.rows[0]);
  }

  async events(user: AuthenticatedUser, bookingId: string) {
    await this.get(user, bookingId);
    const result = await this.database.query(
      `SELECT event_type, from_state, to_state, details, occurred_at
       FROM booking_events WHERE booking_id = $1 ORDER BY occurred_at, id`,
      [bookingId],
    );
    return { events: result.rows };
  }

  async act(user: AuthenticatedUser, bookingId: string, request: BookingActionDto) {
    return this.database.transaction(async (client) => {
      const booking = await this.lockPartyBooking(client, bookingId, user.userId);
      if (booking.party !== "vendor") throw new NotFoundException("No such vendor booking");
      const from = booking.state;
      if (request.action === "accept") {
        if (from !== "requested") throw new ConflictException("Only a requested booking can be accepted");
        const capacityId = request.capacityId ?? booking.capacity_id ?? undefined;
        if (capacityId) {
          await this.reserveCapacity(
            client,
            booking.listing_id,
            capacityId,
            booking.slot_start,
            booking.slot_end,
          );
          await client.query(`UPDATE bookings SET capacity_id = $2 WHERE id = $1`, [
            bookingId,
            capacityId,
          ]);
        }
        const listing = await this.getListingContext(client, booking.listing_id);
        await this.captureTerms(
          client,
          bookingId,
          listing,
          booking.requested_terms,
        );
        await client.query(
          `UPDATE bookings SET state = 'confirmed', response_due_at = NULL WHERE id = $1`,
          [bookingId],
        );
      } else if (request.action === "decline") {
        if (from !== "requested") throw new ConflictException("Only a requested booking can be declined");
        if (!request.reason) throw new BadRequestException("A decline reason is required");
        await client.query(
          `UPDATE bookings SET state = 'declined', decline_reason = $2 WHERE id = $1`,
          [bookingId, request.reason],
        );
      } else if (request.action === "start") {
        if (from !== "confirmed") throw new ConflictException("Only a confirmed booking can start");
        await client.query(`UPDATE bookings SET state = 'in_progress' WHERE id = $1`, [bookingId]);
      } else {
        if (from !== "in_progress") throw new ConflictException("Only an in-progress booking can complete");
        await client.query(
          `UPDATE bookings SET state = 'completed_awaiting',
             completed_at = CURRENT_TIMESTAMP,
             confirmation_due_at = CURRENT_TIMESTAMP + INTERVAL '7 days'
           WHERE id = $1`,
          [bookingId],
        );
      }
      const to = request.action === "accept" ? "confirmed"
        : request.action === "decline" ? "declined"
        : request.action === "start" ? "in_progress" : "completed_awaiting";
      await this.addEvent(client, bookingId, user.userId, `booking.${request.action}`, from, to, {
        reason: request.reason,
      });
      await this.recordChange(client, user.userId, bookingId, request.action, to);
      return this.getWithin(client, user.userId, bookingId);
    });
  }

  async cancel(user: AuthenticatedUser, bookingId: string, request: CancelBookingDto) {
    return this.database.transaction(async (client) => {
      const booking = await this.lockPartyBooking(client, bookingId, user.userId);
      if (!["requested", "confirmed", "in_progress"].includes(booking.state)) {
        throw new ConflictException(`A ${booking.state} booking cannot be cancelled`);
      }
      const ids = [bookingId];
      const stateById = new Map<string, string>([[bookingId, booking.state]]);
      if (booking.series_id && request.scope === "series" && booking.party === "customer") {
        const occurrences = await client.query<{ id: string; state: string }>(
          `SELECT id, state FROM bookings WHERE series_id = $1 AND state IN ('requested', 'confirmed', 'in_progress') FOR UPDATE`,
          [booking.series_id],
        );
        ids.splice(0, 1, ...occurrences.rows.map((row) => row.id));
        for (const occurrence of occurrences.rows) {
          stateById.set(occurrence.id, occurrence.state);
        }
        await client.query(
          `UPDATE booking_series SET state = 'cancelled' WHERE id = $1`,
          [booking.series_id],
        );
      }
      for (const id of ids) {
        const previous = stateById.get(id) ?? "requested";
        const occurrence = await client.query<{ capacity_id: string | null }>(
          `SELECT capacity_id FROM bookings WHERE id = $1`,
          [id],
        );
        if (["confirmed", "in_progress"].includes(previous) && occurrence.rows[0]?.capacity_id) {
          await this.releaseCapacity(client, occurrence.rows[0].capacity_id);
        }
        await client.query(
          `UPDATE bookings SET state = 'cancelled', cancelled_by_user_id = $2,
             cancellation_reason = $3, cancelled_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [id, user.userId, request.reason],
        );
        await this.addEvent(client, id, user.userId, "booking.cancelled", previous, "cancelled", {
          reason: request.reason,
        });
        await this.recordChange(client, user.userId, id, "cancel", "cancelled");
      }
      return { cancelledBookingIds: ids };
    });
  }

  async proposeModification(
    user: AuthenticatedUser,
    bookingId: string,
    request: ProposeBookingModificationDto,
  ) {
    return this.database.transaction(async (client) => {
      const booking = await this.lockPartyBooking(client, bookingId, user.userId);
      if (!["requested", "confirmed", "in_progress"].includes(booking.state)) {
        throw new ConflictException("This booking can no longer be modified");
      }
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO booking_modifications
           (booking_id, proposed_terms, created_by_user_id)
         VALUES ($1, $2::jsonb, $3) RETURNING id`,
        [bookingId, JSON.stringify(request.proposedTerms), user.userId],
      );
      await this.addEvent(client, bookingId, user.userId, "booking.modification_proposed", booking.state, booking.state, {
        modificationId: inserted.rows[0].id,
      });
      await this.recordChange(client, user.userId, bookingId, "modification_propose", booking.state);
      return { id: inserted.rows[0].id, state: "proposed" };
    });
  }

  async decideModification(
    user: AuthenticatedUser,
    modificationId: string,
    request: DecideBookingModificationDto,
  ) {
    return this.database.transaction(async (client) => {
      const found = await client.query<{
        booking_id: string;
        proposed_terms: Record<string, unknown>;
        state: string;
        customer_user_id: string;
        vendor_id: string;
        listing_id: string;
        booking_state: string;
      }>(
        `SELECT modification.booking_id, modification.proposed_terms,
           modification.state, booking.customer_user_id, booking.vendor_id,
           booking.listing_id, booking.state AS booking_state
         FROM booking_modifications AS modification
         JOIN bookings AS booking ON booking.id = modification.booking_id
         WHERE modification.id = $1 FOR UPDATE OF modification, booking`,
        [modificationId],
      );
      const row = found.rows[0];
      if (!row) throw new NotFoundException("No such booking modification");
      const vendor = await this.isVendorOwner(client, row.vendor_id, user.userId);
      if (vendor === (row.customer_user_id === user.userId)) {
        throw new NotFoundException("No such booking modification for this user");
      }
      if (row.state !== "proposed") throw new ConflictException("This modification was already decided");
      const nextState = request.accept ? "accepted" : "declined";
      await client.query(
        `UPDATE booking_modifications
         SET state = $2, decided_by_user_id = $3, decided_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [modificationId, nextState, user.userId],
      );
      if (request.accept) {
        const listing = await this.getListingContext(client, row.listing_id);
        await this.captureTerms(client, row.booking_id, listing, row.proposed_terms);
        await client.query(
          `UPDATE bookings SET requested_terms = $2::jsonb WHERE id = $1`,
          [row.booking_id, JSON.stringify(row.proposed_terms)],
        );
      }
      await this.addEvent(
        client,
        row.booking_id,
        user.userId,
        `booking.modification_${nextState}`,
        row.booking_state,
        row.booking_state,
        { modificationId },
      );
      await this.recordChange(client, user.userId, row.booking_id, `modification_${nextState}`, row.booking_state);
      return { id: modificationId, state: nextState };
    });
  }

  async confirmCompletion(user: AuthenticatedUser, bookingId: string) {
    return this.customerCompletionAction(user, bookingId, null);
  }

  async reportCompletion(
    user: AuthenticatedUser,
    bookingId: string,
    request: ReportBookingCompletionDto,
  ) {
    return this.customerCompletionAction(user, bookingId, request.supportCaseId);
  }

  private async customerCompletionAction(
    user: AuthenticatedUser,
    bookingId: string,
    supportCaseId: string | null,
  ) {
    return this.database.transaction(async (client) => {
      const booking = await this.lockPartyBooking(client, bookingId, user.userId);
      if (booking.party !== "customer") throw new NotFoundException("No such customer booking");
      if (booking.state !== "completed_awaiting") {
        throw new ConflictException("This booking is not awaiting completion confirmation");
      }
      if (supportCaseId) {
        const supportCase = await client.query(
          `SELECT 1 FROM support_cases
           WHERE id = $1 AND transaction_type = 'booking'
             AND transaction_id = $2`,
          [supportCaseId, bookingId],
        );
        if (supportCase.rowCount !== 1) {
          throw new BadRequestException("supportCaseId is not linked to this booking");
        }
        await this.addEvent(client, bookingId, user.userId, "booking.completion_reported", booking.state, booking.state, {
          supportCaseId,
        });
        await this.recordChange(client, user.userId, bookingId, "completion_report", booking.state);
        return { id: bookingId, state: booking.state, supportCaseId };
      }
      await client.query(
        `UPDATE bookings SET state = 'closed', closed_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [bookingId],
      );
      await this.addEvent(client, bookingId, user.userId, "booking.completion_confirmed", booking.state, "closed");
      await this.recordChange(client, user.userId, bookingId, "completion_confirm", "closed");
      return { id: bookingId, state: "closed" };
    });
  }

  async resolveConflicts(user: AuthenticatedUser, request: ResolveBookingConflictsDto) {
    const cancelIds = [...new Set(request.cancelBookingIds)];
    if (cancelIds.includes(request.keepBookingId)) {
      throw new BadRequestException("The retained booking cannot also be cancelled");
    }
    return this.database.transaction(async (client) => {
      const ids = [request.keepBookingId, ...cancelIds];
      const locked = await client.query<{ id: string; state: string; listing_id: string; slot_start: Date; slot_end: Date; capacity_id: string | null }>(
        `SELECT id, state, listing_id, slot_start, slot_end, capacity_id
         FROM bookings WHERE id = ANY($1::uuid[]) AND customer_user_id = $2
         FOR UPDATE`,
        [ids, user.userId],
      );
      if (locked.rowCount !== ids.length || locked.rows.some((row) => row.state !== "confirmed")) {
        throw new BadRequestException("All selected bookings must be confirmed bookings owned by the caller");
      }
      const keep = locked.rows.find((row) => row.id === request.keepBookingId)!;
      for (const row of locked.rows) {
        if (row.id === keep.id) continue;
        if (row.listing_id !== keep.listing_id) {
          throw new BadRequestException("Selected bookings do not conflict");
        }
        const overlap = row.slot_start < keep.slot_end && keep.slot_start < row.slot_end;
        if (!overlap) throw new BadRequestException("Selected bookings do not conflict");
      }
      for (const id of cancelIds) {
        const booking = locked.rows.find((row) => row.id === id);
        if (booking?.capacity_id) await this.releaseCapacity(client, booking.capacity_id);
        await client.query(
          `UPDATE bookings SET state = 'cancelled', cancelled_by_user_id = $2,
             cancellation_reason = 'Customer resolved conflicting confirmations',
             cancelled_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [id, user.userId],
        );
        await this.addEvent(client, id, user.userId, "booking.conflict_cancelled", "confirmed", "cancelled", {
          keptBookingId: keep.id,
        });
        await this.recordChange(client, user.userId, id, "conflict_cancel", "cancelled");
      }
      return { keptBookingId: keep.id, cancelledBookingIds: cancelIds };
    });
  }

  async closeOverdue(): Promise<number> {
    return this.database.transaction(async (client) => {
      const result = await client.query<{ id: string; series_id: string | null }>(
        `UPDATE bookings SET state = 'closed', closed_at = CURRENT_TIMESTAMP
         WHERE state = 'completed_awaiting'
           AND confirmation_due_at <= CURRENT_TIMESTAMP
         RETURNING id, series_id`,
      );
      for (const row of result.rows) {
        await this.addEvent(client, row.id, null, "booking.auto_closed", "completed_awaiting", "closed", {}, "booking-scheduler");
        await this.outbox.enqueue(
          { aggregateType: "booking", aggregateId: row.id, eventType: "booking.auto_closed" },
          client,
        );
      }
      const seriesIds = [...new Set(result.rows.flatMap((row) => row.series_id ? [row.series_id] : []))];
      for (const seriesId of seriesIds) {
        await client.query(
          `UPDATE booking_series SET state = 'completed'
           WHERE id = $1 AND state = 'active'
             AND NOT EXISTS (
               SELECT 1 FROM bookings
               WHERE series_id = $1
                 AND state NOT IN ('closed', 'cancelled', 'declined', 'expired')
             )`,
          [seriesId],
        );
      }
      return result.rowCount ?? 0;
    });
  }

  private async getListingContext(client: Queryable, listingId: string) {
    const result = await client.query<ListingContext>(
      `SELECT listing.id, listing.vendor_id, listing.category_id,
         listing.config_version_number, listing.title, listing.price_min_minor,
         listing.price_currency, listing.time_zone,
         listing.instant_booking_enabled, listing.content_state,
         vendor.owner_user_id, owner.account_status, config.configuration
       FROM listings AS listing
       JOIN vendors AS vendor ON vendor.id = listing.vendor_id
       JOIN users AS owner ON owner.id = vendor.owner_user_id
       JOIN category_config_versions AS config
         ON config.category_id = listing.category_id
        AND config.version_number = listing.config_version_number
       WHERE listing.id = $1`,
      [listingId],
    );
    const listing = result.rows[0];
    if (!listing || listing.content_state !== "approved" || listing.account_status !== "active") {
      throw new NotFoundException("No bookable listing");
    }
    return listing;
  }

  private assertBookingRequest(listing: ListingContext, mode: "instant" | "scheduled") {
    if (mode === "instant" && (!listing.instant_booking_enabled || listing.price_min_minor === null)) {
      throw new ConflictException("This listing does not support instant booking");
    }
  }

  private responseDeadline(configuration: Record<string, unknown>) {
    const seconds = configuration.responseDeadlineSeconds;
    if (typeof seconds !== "number" || !Number.isSafeInteger(seconds) || seconds <= 0) {
      throw new ConflictException("The category has no valid booking response deadline configured");
    }
    return new Date(Date.now() + seconds * 1000);
  }

  private requiredDate(value: unknown, name: string) {
    if (typeof value !== "string") {
      throw new BadRequestException(`The accepted quote must include ${name}`);
    }
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
      throw new BadRequestException(`The accepted quote has an invalid ${name}`);
    }
    return date;
  }

  private validateTimeZone(timeZone: string) {
    try {
      new Intl.DateTimeFormat("en", { timeZone });
    } catch {
      throw new BadRequestException("timeZone must be a valid IANA time zone");
    }
  }

  private async reserveCapacity(
    client: Queryable,
    listingId: string,
    capacityId: string | undefined,
    start: Date,
    end: Date,
  ) {
    if (!capacityId) throw new BadRequestException("capacityId is required for capacity booking");
    const result = await client.query(
      `UPDATE availability_capacity
       SET reserved = reserved + 1
       WHERE id = $1 AND listing_id = $2 AND starts_at <= $3 AND ends_at >= $4
         AND reserved < capacity
       RETURNING id`,
      [capacityId, listingId, start, end],
    );
    if (result.rowCount !== 1) throw new ConflictException("The selected booking capacity is unavailable");
  }

  private async assertCapacityWindow(
    client: Queryable,
    listingId: string,
    capacityId: string,
    start: Date,
    end: Date,
  ) {
    const result = await client.query(
      `SELECT 1 FROM availability_capacity
       WHERE id = $1 AND listing_id = $2 AND starts_at <= $3 AND ends_at >= $4`,
      [capacityId, listingId, start, end],
    );
    if (result.rowCount !== 1) throw new BadRequestException("capacityId does not cover this booking slot");
  }

  private async releaseCapacity(client: Queryable, capacityId: string) {
    const result = await client.query(
      `UPDATE availability_capacity
       SET reserved = reserved - 1
       WHERE id = $1 AND reserved > 0`,
      [capacityId],
    );
    if (result.rowCount !== 1) throw new ConflictException("Booking capacity reservation is inconsistent");
  }

  private async captureTerms(
    client: Queryable,
    bookingId: string,
    listing: ListingContext,
    terms: Record<string, unknown>,
  ) {
    const result = await client.query<{ id: string }>(
      `INSERT INTO booking_terms_snapshots
         (booking_id, version_number, category_id, category_config_version,
          terms, policy_snapshot)
       VALUES ($1, COALESCE((SELECT MAX(version_number) + 1
                             FROM booking_terms_snapshots WHERE booking_id = $1), 1),
               $2, $3, $4::jsonb, $5::jsonb)
       RETURNING id`,
      [
        bookingId,
        listing.category_id,
        listing.config_version_number,
        JSON.stringify({
          listingTitle: listing.title,
          priceMinor: listing.price_min_minor === null ? null : Number(listing.price_min_minor),
          currency: listing.price_currency,
          requestedTerms: terms,
        }),
        JSON.stringify(listing.configuration),
      ],
    );
    return result.rows[0].id;
  }

  private async lockPartyBooking(client: Queryable, bookingId: string, userId: string) {
    const result = await client.query<{
      id: string;
      state: string;
      customer_user_id: string;
      vendor_id: string;
      listing_id: string;
      series_id: string | null;
      capacity_id: string | null;
      slot_start: Date;
      slot_end: Date;
      requested_terms: Record<string, unknown>;
      party: "customer" | "vendor";
    }>(
      `SELECT booking.id, booking.state, booking.customer_user_id,
         booking.vendor_id, booking.listing_id, booking.series_id,
         booking.capacity_id, booking.slot_start, booking.slot_end,
         booking.requested_terms,
         CASE WHEN booking.customer_user_id = $2 THEN 'customer' ELSE 'vendor' END AS party
       FROM bookings AS booking
       WHERE booking.id = $1 AND (
         booking.customer_user_id = $2 OR EXISTS (
           SELECT 1 FROM vendors
           WHERE vendors.id = booking.vendor_id AND owner_user_id = $2
         )
       ) FOR UPDATE`,
      [bookingId, userId],
    );
    if (!result.rows[0]) throw new NotFoundException("No such booking");
    return result.rows[0];
  }

  private async getWithin(client: Queryable, userId: string, bookingId: string) {
    const result = await client.query<BookingRow>(
      `${BOOKING_SELECT}
       WHERE id = $1 AND (
         customer_user_id = $2 OR EXISTS (
           SELECT 1 FROM vendors
           WHERE vendors.id = bookings.vendor_id AND owner_user_id = $2
         )
       )`,
      [bookingId, userId],
    );
    if (!result.rows[0]) throw new NotFoundException("No such booking");
    return toView(result.rows[0]);
  }

  private async requireVendorOwner(client: Queryable, vendorId: string, userId: string) {
    if (!(await this.isVendorOwner(client, vendorId, userId))) {
      throw new NotFoundException("No such vendor for this user");
    }
  }

  private async isVendorOwner(client: Queryable, vendorId: string, userId: string) {
    const result = await client.query(
      `SELECT 1 FROM vendors WHERE id = $1 AND owner_user_id = $2`,
      [vendorId, userId],
    );
    return result.rowCount === 1;
  }

  private async addEvent(
    client: Queryable,
    bookingId: string,
    actorUserId: string | null,
    eventType: string,
    fromState: string | null,
    toState: string | null,
    details: Record<string, unknown> = {},
    actorService?: string,
  ) {
    await client.query(
      `INSERT INTO booking_events
         (booking_id, actor_user_id, actor_service, event_type, from_state, to_state, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [bookingId, actorUserId, actorService ?? null, eventType, fromState, toState, JSON.stringify(details)],
    );
  }

  private async recordChange(
    client: PoolClient,
    userId: string,
    bookingId: string,
    action: string,
    state: string,
  ) {
    await this.audit.record(
      {
        actorUserId: userId,
        action: `booking.${action}`,
        targetType: "booking",
        targetId: bookingId,
        metadata: { state },
      },
      client,
    );
    await this.outbox.enqueue(
      { aggregateType: "booking", aggregateId: bookingId, eventType: `booking.${action}` },
      client,
    );
  }
}
