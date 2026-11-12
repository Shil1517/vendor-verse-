import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import {
  BusinessType,
  CreateVendorDto,
  UpdateVendorDto,
} from "./dto/vendor.dto";

export interface VendorRoleSummary {
  roleCode: string;
  status: "pending" | "verified" | "rejected" | "revoked";
  /** Only verified roles are shown publicly (D-020, D-021). */
  isPublic: boolean;
}

export interface VendorView {
  id: string;
  /** The primary role. All roles, with their status, are in `roles`. */
  businessType: BusinessType | null;
  roles: VendorRoleSummary[];
  legalName: string | null;
  registrationCountry: string | null;
  tradingName: string | null;
  description: string | null;
  languages: string[];
  yearEstablished: number | null;
  createdAt: string;
}

/** What anyone may see. Only verified roles appear (D-020, D-021). */
export interface PublicVendorView {
  id: string;
  name: string;
  legalName: string | null;
  registrationCountry: string | null;
  description: string | null;
  languages: string[];
  yearEstablished: number | null;
  roles: Array<{
    roleCode: string;
    label: string;
    offerType: "products" | "services" | null;
  }>;
}

interface PublicVendorRow {
  id: string;
  legal_name: string | null;
  registration_country: string | null;
  trading_name: string | null;
  description: string | null;
  languages: string[] | null;
  year_established: number | null;
  roles: PublicVendorView["roles"] | null;
}

interface VendorRow {
  id: string;
  business_type: BusinessType | null;
  roles?: Array<{ roleCode: string; status: VendorRoleSummary["status"] }> | null;
  legal_name: string | null;
  registration_country: string | null;
  trading_name: string | null;
  description: string | null;
  languages: string[] | null;
  year_established: number | null;
  created_at: Date;
}

const VENDOR_SELECT = `SELECT v.id, v.business_type,
        (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                  'roleCode', r.role_code, 'status', r.status)
                ORDER BY r.created_at, r.role_code), '[]'::jsonb)
         FROM vendor_roles AS r WHERE r.vendor_id = v.id) AS roles,
        v.legal_name,
        v.registration_country, p.trading_name, p.description,
        p.languages, p.year_established, v.created_at
 FROM vendors AS v
 LEFT JOIN vendor_profiles AS p ON p.vendor_id = v.id`;

/**
 * F-VND-01 / F-VND-02 vendor onboarding and own-profile editing. Every
 * statement is scoped to the owner, so another owner's vendor id is a 404.
 * Verification (F-VND-03) and publication (F-VND-05) are separate; a new vendor
 * is only registered (level L0) and not public. Platform-computed fields
 * (verification, ratings) are not writable here.
 */
@Injectable()
export class VendorsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async create(
    user: AuthenticatedUser,
    request: CreateVendorDto,
  ): Promise<VendorView> {
    const id = randomUUID();
    await this.database.transaction(async (client) => {
      const country = await client.query(
        `SELECT 1 FROM countries WHERE iso_code = $1`,
        [request.registrationCountry],
      );
      if (country.rowCount !== 1) {
        throw new BadRequestException("registrationCountry is not supported");
      }
      const roleCodes = [
        ...new Set([request.businessType, ...(request.roleCodes ?? [])]),
      ];
      await this.assertActiveRoles(client, roleCodes);
      await client.query(
        `INSERT INTO vendors
           (id, owner_user_id, business_type, legal_name, registration_country)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          id,
          user.userId,
          request.businessType,
          request.legalName,
          request.registrationCountry,
        ],
      );
      await client.query(
        `INSERT INTO vendor_profiles (vendor_id, trading_name)
         VALUES ($1, $2)`,
        [id, request.tradingName ?? null],
      );
      // every role starts pending: nothing is public until verified (D-020)
      await client.query(
        `INSERT INTO vendor_roles (vendor_id, role_code)
         SELECT $1, UNNEST($2::text[])`,
        [id, roleCodes],
      );
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "vendor.create",
          targetType: "vendor",
          targetId: id,
          metadata: {
            businessType: request.businessType,
            roleCodes,
            registrationCountry: request.registrationCountry,
          },
        },
        client,
      );
    });
    return this.get(user, id);
  }

  async listMine(user: AuthenticatedUser): Promise<VendorView[]> {
    const result = await this.database.query<VendorRow>(
      `${VENDOR_SELECT}
       WHERE v.owner_user_id = $1
       ORDER BY v.created_at, v.id`,
      [user.userId],
    );
    return result.rows.map(toView);
  }

  async get(user: AuthenticatedUser, vendorId: string): Promise<VendorView> {
    const result = await this.database.query<VendorRow>(
      `${VENDOR_SELECT}
       WHERE v.id = $1 AND v.owner_user_id = $2`,
      [vendorId, user.userId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("No such vendor for this user");
    }
    return toView(row);
  }

  async update(
    user: AuthenticatedUser,
    vendorId: string,
    request: UpdateVendorDto,
  ): Promise<VendorView> {
    await this.database.transaction(async (client) => {
      const owned = await client.query(
        `SELECT 1 FROM vendors WHERE id = $1 AND owner_user_id = $2
         FOR UPDATE`,
        [vendorId, user.userId],
      );
      if (owned.rowCount !== 1) {
        throw new NotFoundException("No such vendor for this user");
      }
      if (request.businessType !== undefined) {
        await this.assertActiveRoles(client, [request.businessType]);
        await client.query(
          `INSERT INTO vendor_roles (vendor_id, role_code) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [vendorId, request.businessType],
        );
      }
      await client.query(
        `UPDATE vendors
         SET business_type = COALESCE($2, business_type),
             legal_name = COALESCE($3, legal_name)
         WHERE id = $1`,
        [vendorId, request.businessType ?? null, request.legalName ?? null],
      );
      await client.query(
        `INSERT INTO vendor_profiles
           (vendor_id, trading_name, description, languages, year_established)
         VALUES ($1, $2, $3, COALESCE($4::jsonb, '[]'::jsonb), $5)
         ON CONFLICT (vendor_id) DO UPDATE
         SET trading_name = COALESCE($2, vendor_profiles.trading_name),
             description = COALESCE($3, vendor_profiles.description),
             languages = COALESCE($4::jsonb, vendor_profiles.languages),
             year_established =
               COALESCE($5, vendor_profiles.year_established)`,
        [
          vendorId,
          request.tradingName ?? null,
          request.description ?? null,
          request.languages === undefined
            ? null
            : JSON.stringify(request.languages),
          request.yearEstablished ?? null,
        ],
      );
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "vendor.update",
          targetType: "vendor",
          targetId: vendorId,
          metadata: {
            fields: Object.keys(request).filter(
              (key) => request[key as keyof UpdateVendorDto] !== undefined,
            ),
          },
        },
        client,
      );
    });
    return this.get(user, vendorId);
  }

  /**
   * Public read of one vendor. A vendor with no verified role is not public and
   * answers 404, so unreviewed claims are never shown (D-020, D-021). The full
   * publication gates (F-VND-05) are computed elsewhere and are not part of this.
   */
  async getPublic(vendorId: string): Promise<PublicVendorView> {
    const result = await this.database.query<PublicVendorRow>(
      `SELECT v.id, v.legal_name, v.registration_country, p.trading_name,
              p.description, p.languages, p.year_established,
              (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'roleCode', r.role_code, 'label', d.label,
                        'offerType', d.offer_type)
                      ORDER BY r.created_at, r.role_code), '[]'::jsonb)
               FROM vendor_roles AS r
               JOIN vendor_role_definitions AS d ON d.code = r.role_code
               WHERE r.vendor_id = v.id AND r.status = 'verified') AS roles
       FROM vendors AS v
       LEFT JOIN vendor_profiles AS p ON p.vendor_id = v.id
       WHERE v.id = $1`,
      [vendorId],
    );
    const row = result.rows[0];
    const roles = row?.roles ?? [];
    if (!row || roles.length === 0) {
      throw new NotFoundException("No such vendor");
    }
    return {
      id: row.id,
      name: row.trading_name ?? row.legal_name ?? "",
      legalName: row.legal_name,
      registrationCountry: row.registration_country,
      description: row.description,
      languages: row.languages ?? [],
      yearEstablished: row.year_established,
      roles,
    };
  }

  /** Every code must be an active role in the catalogue (D-024). */
  private async assertActiveRoles(
    client: { query: DatabaseService["query"] },
    roleCodes: string[],
  ): Promise<void> {
    const found = await client.query<{ code: string }>(
      `SELECT code FROM vendor_role_definitions
       WHERE code = ANY($1::text[]) AND is_active`,
      [roleCodes],
    );
    if (found.rowCount !== roleCodes.length) {
      const known = new Set(found.rows.map((row) => row.code));
      const bad = roleCodes.filter((code) => !known.has(code));
      throw new BadRequestException(
        `Unknown or retired vendor role: ${bad.join(", ")}`,
      );
    }
  }
}

function toView(row: VendorRow): VendorView {
  return {
    id: row.id,
    businessType: row.business_type,
    roles: (row.roles ?? []).map((role) => ({
      roleCode: role.roleCode,
      status: role.status,
      isPublic: role.status === "verified",
    })),
    legalName: row.legal_name,
    registrationCountry: row.registration_country,
    tradingName: row.trading_name,
    description: row.description,
    languages: row.languages ?? [],
    yearEstablished: row.year_established,
    createdAt: row.created_at.toISOString(),
  };
}
