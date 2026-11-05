import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PoolClient } from "pg";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import {
  CreateLocationDto,
  UpdateLocationDto,
  UpdateProfileDto,
} from "./dto/profile.dto";

export interface ProfileView {
  userId: string;
  displayName: string | null;
  phone: string | null;
  email: string | null;
  emailVerified: boolean;
  customerType: "individual" | "business";
  companyName: string | null;
  locale: {
    country?: string;
    language?: string;
    timeZone?: string;
    currency?: string;
  };
}

export interface LocationView {
  id: string;
  label: string;
  addressText: string;
  postalCode: string | null;
  cityId: string | null;
  isDefault: boolean;
  createdAt: string;
}

interface ProfileRow {
  id: string;
  locale: ProfileView["locale"] | null;
  display_name: string | null;
  contact_email: string | null;
  customer_type: "individual" | "business" | null;
  company_name: string | null;
  phone: string | null;
  email_verified: boolean;
}

interface LocationRow {
  id: string;
  label: string;
  address: { text?: string } | null;
  postal_code: string | null;
  city_id: string | null;
  is_default: boolean;
  created_at: Date;
}

const FOREIGN_KEY_VIOLATION = "23503";

const LOCATION_COLUMNS = `id, label, address, postal_code, city_id, is_default, created_at`;

/**
 * F-ACC-06 customer profile and saved locations. Every statement is scoped to
 * the authenticated user's id, so a changed record id can never reach another
 * user's data (PRS 4.3); a foreign or unknown id is reported as 404.
 */
@Injectable()
export class ProfileService {
  constructor(private readonly database: DatabaseService) {}

  async getProfile(user: AuthenticatedUser): Promise<ProfileView> {
    const result = await this.database.query<ProfileRow>(
      `SELECT account.id, account.locale,
              profile.display_name, profile.contact_email,
              profile.customer_type, profile.company_name,
              (SELECT identifier.normalized_value
               FROM user_identifiers AS identifier
               WHERE identifier.user_id = account.id
                 AND identifier.channel = 'phone'
                 AND identifier.verified_at IS NOT NULL
               ORDER BY identifier.created_at
               LIMIT 1) AS phone,
              EXISTS (
                SELECT 1 FROM user_identifiers AS identifier
                WHERE identifier.user_id = account.id
                  AND identifier.channel = 'email'
                  AND identifier.verified_at IS NOT NULL
                  AND identifier.normalized_value = profile.contact_email
              ) AS email_verified
       FROM users AS account
       LEFT JOIN customer_profiles AS profile ON profile.user_id = account.id
       WHERE account.id = $1`,
      [user.userId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new ServiceUnavailableException(
        "Authenticated account is missing from persistence",
      );
    }
    return this.toProfile(row);
  }

  async updateProfile(
    user: AuthenticatedUser,
    request: UpdateProfileDto,
  ): Promise<ProfileView> {
    await this.database.transaction(async (client) => {
      const current = await client.query<{
        display_name: string | null;
        contact_email: string | null;
        customer_type: "individual" | "business";
        company_name: string | null;
      }>(
        `SELECT display_name, contact_email, customer_type, company_name
         FROM customer_profiles WHERE user_id = $1 FOR UPDATE`,
        [user.userId],
      );
      const before = current.rows[0];
      const customerType =
        request.customerType ?? before?.customer_type ?? "individual";
      // an individual has no company; a business keeps or sets one
      const companyName =
        customerType === "individual"
          ? null
          : request.companyName === undefined
            ? (before?.company_name ?? null)
            : request.companyName;

      await client.query(
        `INSERT INTO customer_profiles
           (user_id, display_name, contact_email, customer_type, company_name)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE
           SET display_name = EXCLUDED.display_name,
               contact_email = EXCLUDED.contact_email,
               customer_type = EXCLUDED.customer_type,
               company_name = EXCLUDED.company_name`,
        [
          user.userId,
          request.displayName ?? before?.display_name ?? null,
          request.email === undefined
            ? (before?.contact_email ?? null)
            : request.email,
          customerType,
          companyName,
        ],
      );

      const locale = this.definedLocale(request.locale);
      if (Object.keys(locale).length > 0) {
        await client.query(
          `UPDATE users SET locale = locale || $2::jsonb WHERE id = $1`,
          [user.userId, JSON.stringify(locale)],
        );
      }
    });
    return this.getProfile(user);
  }

  async listLocations(user: AuthenticatedUser): Promise<LocationView[]> {
    const result = await this.database.query<LocationRow>(
      `SELECT ${LOCATION_COLUMNS}
       FROM saved_locations
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at, id`,
      [user.userId],
    );
    return result.rows.map((row) => this.toLocation(row));
  }

  async createLocation(
    user: AuthenticatedUser,
    request: CreateLocationDto,
  ): Promise<LocationView> {
    try {
      return await this.database.transaction(async (client) => {
        // serialise concurrent edits of one user's locations
        await client.query(`SELECT 1 FROM users WHERE id = $1 FOR UPDATE`, [
          user.userId,
        ]);
        const existing = await client.query<{ count: string }>(
          `SELECT count(*) FROM saved_locations WHERE user_id = $1`,
          [user.userId],
        );
        const makeDefault =
          request.isDefault === true || Number(existing.rows[0].count) === 0;
        if (makeDefault) await this.clearDefault(client, user.userId);
        const inserted = await client.query<LocationRow>(
          `INSERT INTO saved_locations
             (user_id, label, address, postal_code, city_id, is_default)
           VALUES ($1, $2, $3::jsonb, $4, $5, $6)
           RETURNING ${LOCATION_COLUMNS}`,
          [
            user.userId,
            request.label,
            JSON.stringify({ text: request.addressText }),
            request.postalCode ?? null,
            request.cityId ?? null,
            makeDefault,
          ],
        );
        return this.toLocation(inserted.rows[0]);
      });
    } catch (error) {
      throw this.translateLocationError(error);
    }
  }

  async updateLocation(
    user: AuthenticatedUser,
    locationId: string,
    request: UpdateLocationDto,
  ): Promise<LocationView> {
    try {
      return await this.database.transaction(async (client) => {
        await client.query(`SELECT 1 FROM users WHERE id = $1 FOR UPDATE`, [
          user.userId,
        ]);
        const current = await client.query<LocationRow>(
          `SELECT ${LOCATION_COLUMNS} FROM saved_locations
           WHERE id = $1 AND user_id = $2 FOR UPDATE`,
          [locationId, user.userId],
        );
        const row = current.rows[0];
        if (!row) throw new NotFoundException("Location not found");
        if (request.isDefault === false && row.is_default) {
          throw new ConflictException(
            "Choose another location as the default instead",
          );
        }
        if (request.isDefault === true && !row.is_default) {
          await this.clearDefault(client, user.userId);
        }
        const updated = await client.query<LocationRow>(
          `UPDATE saved_locations
           SET label = $3,
               address = $4::jsonb,
               postal_code = $5,
               city_id = $6,
               is_default = $7
           WHERE id = $1 AND user_id = $2
           RETURNING ${LOCATION_COLUMNS}`,
          [
            locationId,
            user.userId,
            request.label ?? row.label,
            JSON.stringify({
              ...(row.address ?? {}),
              text: request.addressText ?? row.address?.text ?? "",
            }),
            request.postalCode === undefined
              ? row.postal_code
              : request.postalCode,
            request.cityId === undefined ? row.city_id : request.cityId,
            request.isDefault === true ? true : row.is_default,
          ],
        );
        return this.toLocation(updated.rows[0]);
      });
    } catch (error) {
      throw this.translateLocationError(error);
    }
  }

  async deleteLocation(
    user: AuthenticatedUser,
    locationId: string,
  ): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query(`SELECT 1 FROM users WHERE id = $1 FOR UPDATE`, [
        user.userId,
      ]);
      const removed = await client.query<{ is_default: boolean }>(
        `DELETE FROM saved_locations
         WHERE id = $1 AND user_id = $2
         RETURNING is_default`,
        [locationId, user.userId],
      );
      if (removed.rowCount !== 1) throw new NotFoundException("Location not found");
      if (removed.rows[0].is_default) {
        // keep exactly one default while any location remains
        await client.query(
          `UPDATE saved_locations SET is_default = true
           WHERE id = (SELECT id FROM saved_locations
                       WHERE user_id = $1
                       ORDER BY created_at, id LIMIT 1)`,
          [user.userId],
        );
      }
    });
  }

  private async clearDefault(client: PoolClient, userId: string): Promise<void> {
    await client.query(
      `UPDATE saved_locations SET is_default = false
       WHERE user_id = $1 AND is_default`,
      [userId],
    );
  }

  private definedLocale(
    locale: UpdateProfileDto["locale"],
  ): Record<string, string> {
    const defined: Record<string, string> = {};
    for (const key of ["country", "language", "timeZone", "currency"] as const) {
      const value = locale?.[key];
      if (value !== undefined) defined[key] = value;
    }
    return defined;
  }

  private translateLocationError(error: unknown): unknown {
    if ((error as { code?: string }).code === FOREIGN_KEY_VIOLATION) {
      return new BadRequestException("cityId does not match a known city");
    }
    return error;
  }

  private toProfile(row: ProfileRow): ProfileView {
    return {
      userId: row.id,
      displayName: row.display_name,
      phone: row.phone,
      email: row.contact_email,
      emailVerified: row.email_verified,
      customerType: row.customer_type ?? "individual",
      companyName: row.company_name,
      locale: row.locale ?? {},
    };
  }

  private toLocation(row: LocationRow): LocationView {
    return {
      id: row.id,
      label: row.label,
      addressText: row.address?.text ?? "",
      postalCode: row.postal_code,
      cityId: row.city_id,
      isDefault: row.is_default,
      createdAt: row.created_at.toISOString(),
    };
  }
}
