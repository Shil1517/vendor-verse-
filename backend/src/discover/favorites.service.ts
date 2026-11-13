import { Injectable, NotFoundException } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";

export interface FavoriteView {
  vendorId: string;
  name: string;
  roles: string[];
  favoritedAt: string;
}

interface FavoriteRow {
  vendor_id: string;
  name: string | null;
  roles: string[] | null;
  created_at: Date;
}

/**
 * F-DSC-07 favourites. A customer saves vendors; only vendors that are public
 * (at least one verified role, D-020) can be saved, so a favourite never
 * reveals an unreviewed vendor. Compare-up-to-three is client state.
 */
@Injectable()
export class FavoritesService {
  constructor(private readonly database: DatabaseService) {}

  async list(user: AuthenticatedUser): Promise<FavoriteView[]> {
    const result = await this.database.query<FavoriteRow>(
      `SELECT f.vendor_id, f.created_at,
              COALESCE(vp.trading_name, v.legal_name) AS name,
              (SELECT array_agg(r.role_code ORDER BY r.role_code)
               FROM vendor_roles AS r
               WHERE r.vendor_id = v.id AND r.status = 'verified') AS roles
       FROM favorites AS f
       JOIN vendors AS v ON v.id = f.vendor_id
       LEFT JOIN vendor_profiles AS vp ON vp.vendor_id = v.id
       WHERE f.customer_user_id = $1
       ORDER BY f.created_at DESC`,
      [user.userId],
    );
    return result.rows.map((row) => ({
      vendorId: row.vendor_id,
      name: row.name ?? "",
      roles: row.roles ?? [],
      favoritedAt: row.created_at.toISOString(),
    }));
  }

  /** Idempotent: saving twice leaves one row. */
  async add(user: AuthenticatedUser, vendorId: string): Promise<void> {
    const saved = await this.database.query(
      `INSERT INTO favorites (customer_user_id, vendor_id)
       SELECT $1, v.id FROM vendors AS v
       WHERE v.id = $2
         AND EXISTS (SELECT 1 FROM vendor_roles AS r
                     WHERE r.vendor_id = v.id AND r.status = 'verified')
       ON CONFLICT DO NOTHING`,
      [user.userId, vendorId],
    );
    if (saved.rowCount === 0) {
      const exists = await this.database.query(
        `SELECT 1 FROM favorites WHERE customer_user_id = $1 AND vendor_id = $2`,
        [user.userId, vendorId],
      );
      if (exists.rowCount !== 1) {
        throw new NotFoundException("No such vendor");
      }
    }
  }

  /** Idempotent: removing something not saved is not an error. */
  async remove(user: AuthenticatedUser, vendorId: string): Promise<void> {
    await this.database.query(
      `DELETE FROM favorites WHERE customer_user_id = $1 AND vendor_id = $2`,
      [user.userId, vendorId],
    );
  }
}
