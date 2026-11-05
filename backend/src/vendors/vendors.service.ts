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

export interface VendorView {
  id: string;
  businessType: BusinessType | null;
  legalName: string | null;
  registrationCountry: string | null;
  tradingName: string | null;
  description: string | null;
  languages: string[];
  yearEstablished: number | null;
  createdAt: string;
}

interface VendorRow {
  id: string;
  business_type: BusinessType | null;
  legal_name: string | null;
  registration_country: string | null;
  trading_name: string | null;
  description: string | null;
  languages: string[] | null;
  year_established: number | null;
  created_at: Date;
}

const VENDOR_SELECT = `SELECT v.id, v.business_type, v.legal_name,
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
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "vendor.create",
          targetType: "vendor",
          targetId: id,
          metadata: {
            businessType: request.businessType,
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
}

function toView(row: VendorRow): VendorView {
  return {
    id: row.id,
    businessType: row.business_type,
    legalName: row.legal_name,
    registrationCountry: row.registration_country,
    tradingName: row.trading_name,
    description: row.description,
    languages: row.languages ?? [],
    yearEstablished: row.year_established,
    createdAt: row.created_at.toISOString(),
  };
}
