import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";

export interface WaitlistEntryView {
  cityId: string;
  cityName: string;
  joinedAt: string;
}

/**
 * F-GEO-02 waitlist for cities that are not live yet. Signed-in users only
 * here; the table also allows a contact-only entry, which is not exposed.
 * Joining a live city is refused (there is nothing to wait for).
 */
@Injectable()
export class WaitlistService {
  constructor(private readonly database: DatabaseService) {}

  async list(user: AuthenticatedUser): Promise<WaitlistEntryView[]> {
    const result = await this.database.query<{
      city_id: string;
      city_name: string;
      created_at: Date;
    }>(
      `SELECT w.city_id, c.name AS city_name, w.created_at
       FROM market_waitlist AS w
       JOIN cities AS c ON c.id = w.city_id
       WHERE w.user_id = $1 AND w.status = 'waiting'
       ORDER BY w.created_at, w.id`,
      [user.userId],
    );
    return result.rows.map((row) => ({
      cityId: row.city_id,
      cityName: row.city_name,
      joinedAt: row.created_at.toISOString(),
    }));
  }

  async join(
    user: AuthenticatedUser,
    cityId: string,
  ): Promise<WaitlistEntryView> {
    return this.database.transaction(async (client) => {
      const city = await client.query<{ name: string; is_live: boolean }>(
        `SELECT c.name, COALESCE(m.status = 'live', false) AS is_live
         FROM cities AS c
         LEFT JOIN market_activations AS m ON m.city_id = c.id
         WHERE c.id = $1`,
        [cityId],
      );
      const row = city.rows[0];
      if (!row) {
        throw new NotFoundException("No such city");
      }
      if (row.is_live) {
        throw new BadRequestException("This city is already live");
      }
      const inserted = await client.query<{ created_at: Date }>(
        `INSERT INTO market_waitlist (city_id, user_id)
         SELECT $1::uuid, $2::uuid
         WHERE NOT EXISTS (
           SELECT 1 FROM market_waitlist
           WHERE city_id = $1::uuid AND user_id = $2::uuid AND status = 'waiting'
         )
         RETURNING created_at`,
        [cityId, user.userId],
      );
      if (!inserted.rows[0]) {
        throw new ConflictException("Already on the waitlist for this city");
      }
      return {
        cityId,
        cityName: row.name,
        joinedAt: inserted.rows[0].created_at.toISOString(),
      };
    });
  }

  async leave(user: AuthenticatedUser, cityId: string): Promise<void> {
    const result = await this.database.query(
      `UPDATE market_waitlist SET status = 'cancelled'
       WHERE city_id = $1 AND user_id = $2 AND status = 'waiting'`,
      [cityId, user.userId],
    );
    if (result.rowCount !== 1) {
      throw new NotFoundException("Not on the waitlist for this city");
    }
  }
}
