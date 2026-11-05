import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PoolClient } from "pg";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import {
  CreateCapacityWindowDto,
  UpsertAvailabilityRuleDto,
} from "./dto/availability.dto";
import { parseWeeklySchedule, TimeRange } from "./weekly-schedule";

export interface AvailabilityRuleView {
  availabilityModel: string;
  timeZone: string;
  weeklySchedule: Record<string, TimeRange[]>;
  validFrom: string | null;
  validTo: string | null;
}

export interface CapacityWindowView {
  id: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  reserved: number;
}

const EXCLUSION_VIOLATION = "23P01";
const CHECK_VIOLATION = "23514";

/**
 * F-VND-08 availability: a weekly rule plus bookable capacity windows per
 * listing. Availability is shown only if the vendor provides it, so a listing
 * with no rule simply has none. Owner only. Reservation against capacity
 * belongs to bookings (F-BKG-*) and is not built.
 */
@Injectable()
export class AvailabilityService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async getRule(
    user: AuthenticatedUser,
    listingId: string,
  ): Promise<AvailabilityRuleView | null> {
    await this.requireOwned(this.database, listingId, user.userId);
    const result = await this.database.query<RuleRow>(
      `SELECT availability_model, time_zone, weekly_schedule,
              to_char(valid_from, 'YYYY-MM-DD') AS valid_from,
              to_char(valid_to, 'YYYY-MM-DD') AS valid_to
       FROM availability_rules WHERE listing_id = $1`,
      [listingId],
    );
    return result.rows[0] ? toRule(result.rows[0]) : null;
  }

  async setRule(
    user: AuthenticatedUser,
    listingId: string,
    request: UpsertAvailabilityRuleDto,
  ): Promise<AvailabilityRuleView> {
    const parsed = parseWeeklySchedule(request.weeklySchedule);
    if (!parsed.ok) {
      throw new BadRequestException(parsed.error);
    }
    try {
      await this.database.transaction(async (client) => {
        await this.requireOwned(client, listingId, user.userId, true);
        // one rule per listing: replace it
        await client.query(
          `DELETE FROM availability_rules WHERE listing_id = $1`,
          [listingId],
        );
        await client.query(
          `INSERT INTO availability_rules
             (listing_id, availability_model, time_zone, weekly_schedule,
              valid_from, valid_to)
           VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
          [
            listingId,
            request.availabilityModel,
            request.timeZone,
            JSON.stringify(parsed.schedule),
            request.validFrom ?? null,
            request.validTo ?? null,
          ],
        );
        await this.audit.record(
          {
            actorUserId: user.userId,
            action: "listing.availability_set",
            targetType: "listing",
            targetId: listingId,
          },
          client,
        );
      });
    } catch (error) {
      if ((error as { code?: string }).code === CHECK_VIOLATION) {
        throw new BadRequestException("validTo cannot be before validFrom");
      }
      throw error;
    }
    const rule = await this.getRule(user, listingId);
    return rule as AvailabilityRuleView;
  }

  async clearRule(user: AuthenticatedUser, listingId: string): Promise<void> {
    await this.database.transaction(async (client) => {
      await this.requireOwned(client, listingId, user.userId, true);
      const deleted = await client.query(
        `DELETE FROM availability_rules WHERE listing_id = $1`,
        [listingId],
      );
      if (deleted.rowCount !== 1) {
        throw new NotFoundException("This listing has no availability rule");
      }
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "listing.availability_clear",
          targetType: "listing",
          targetId: listingId,
        },
        client,
      );
    });
  }

  async listWindows(
    user: AuthenticatedUser,
    listingId: string,
  ): Promise<CapacityWindowView[]> {
    await this.requireOwned(this.database, listingId, user.userId);
    const result = await this.database.query<WindowRow>(
      `SELECT id, starts_at, ends_at, capacity, reserved
       FROM availability_capacity
       WHERE listing_id = $1
       ORDER BY starts_at`,
      [listingId],
    );
    return result.rows.map(toWindow);
  }

  async addWindow(
    user: AuthenticatedUser,
    listingId: string,
    request: CreateCapacityWindowDto,
  ): Promise<CapacityWindowView> {
    const startsAt = new Date(request.startsAt);
    const endsAt = new Date(request.endsAt);
    if (endsAt <= startsAt) {
      throw new BadRequestException("endsAt must be after startsAt");
    }
    try {
      return await this.database.transaction(async (client) => {
        await this.requireOwned(client, listingId, user.userId, true);
        const inserted = await client.query<WindowRow>(
          `INSERT INTO availability_capacity
             (listing_id, starts_at, ends_at, capacity)
           VALUES ($1, $2, $3, $4)
           RETURNING id, starts_at, ends_at, capacity, reserved`,
          [listingId, startsAt, endsAt, request.capacity],
        );
        await this.audit.record(
          {
            actorUserId: user.userId,
            action: "listing.capacity_add",
            targetType: "listing",
            targetId: listingId,
            metadata: { windowId: inserted.rows[0].id },
          },
          client,
        );
        return toWindow(inserted.rows[0]);
      });
    } catch (error) {
      if ((error as { code?: string }).code === EXCLUSION_VIOLATION) {
        throw new ConflictException("That window overlaps an existing one");
      }
      throw error;
    }
  }

  async removeWindow(
    user: AuthenticatedUser,
    listingId: string,
    windowId: string,
  ): Promise<void> {
    await this.database.transaction(async (client) => {
      await this.requireOwned(client, listingId, user.userId, true);
      const found = await client.query<{ reserved: number }>(
        `SELECT reserved FROM availability_capacity
         WHERE id = $1 AND listing_id = $2 FOR UPDATE`,
        [windowId, listingId],
      );
      if (!found.rows[0]) {
        throw new NotFoundException("No such capacity window for this listing");
      }
      if (found.rows[0].reserved > 0) {
        throw new ConflictException(
          "A window with reservations cannot be removed",
        );
      }
      await client.query(`DELETE FROM availability_capacity WHERE id = $1`, [
        windowId,
      ]);
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "listing.capacity_remove",
          targetType: "listing",
          targetId: listingId,
          metadata: { windowId },
        },
        client,
      );
    });
  }

  private async requireOwned(
    runner: Pick<PoolClient, "query"> | DatabaseService,
    listingId: string,
    userId: string,
    lock = false,
  ): Promise<void> {
    const owned = await (runner as DatabaseService).query(
      `SELECT 1 FROM listings AS l
       JOIN vendors AS v ON v.id = l.vendor_id
       WHERE l.id = $1 AND v.owner_user_id = $2${lock ? " FOR UPDATE OF l" : ""}`,
      [listingId, userId],
    );
    if (owned.rowCount !== 1) {
      throw new NotFoundException("No such listing for this user");
    }
  }
}

interface RuleRow {
  availability_model: string;
  time_zone: string;
  weekly_schedule: Record<string, TimeRange[]>;
  valid_from: string | null;
  valid_to: string | null;
}

interface WindowRow {
  id: string;
  starts_at: Date;
  ends_at: Date;
  capacity: number;
  reserved: number;
}

const toRule = (row: RuleRow): AvailabilityRuleView => ({
  availabilityModel: row.availability_model,
  timeZone: row.time_zone,
  weeklySchedule: row.weekly_schedule,
  validFrom: row.valid_from,
  validTo: row.valid_to,
});

const toWindow = (row: WindowRow): CapacityWindowView => ({
  id: row.id,
  startsAt: row.starts_at.toISOString(),
  endsAt: row.ends_at.toISOString(),
  capacity: row.capacity,
  reserved: row.reserved,
});
