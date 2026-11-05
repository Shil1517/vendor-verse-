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
import { CoverageType, CreateServiceAreaDto } from "./dto/service-area.dto";

export interface ServiceAreaView {
  id: string;
  coverageType: CoverageType;
  countryCode: string | null;
  regionId: string | null;
  regionName: string | null;
  cityId: string | null;
  cityName: string | null;
  postalCode: string | null;
  radiusKm: number | null;
  latitude: number | null;
  longitude: number | null;
}

interface AreaRow {
  id: string;
  coverage_type: CoverageType;
  country_code: string | null;
  region_id: string | null;
  region_name: string | null;
  city_id: string | null;
  city_name: string | null;
  postal_code: string | null;
  radius_km: string | null;
  center_latitude: string | null;
  center_longitude: string | null;
}

const FOREIGN_KEY_VIOLATION = "23503";

const AREA_SELECT = `SELECT a.id, a.coverage_type,
        COALESCE(co.iso_code, ci_country.iso_code, re_country.iso_code) AS country_code,
        a.region_id, re.name AS region_name, a.city_id, ci.name AS city_name,
        a.postal_code, a.radius_km, a.center_latitude, a.center_longitude
 FROM service_areas AS a
 LEFT JOIN countries AS co ON co.id = a.country_id
 LEFT JOIN regions AS re ON re.id = a.region_id
 LEFT JOIN countries AS re_country ON re_country.id = re.country_id
 LEFT JOIN cities AS ci ON ci.id = a.city_id
 LEFT JOIN countries AS ci_country ON ci_country.id = ci.country_id`;

/**
 * F-GEO-06 / F-VND-08 vendor coverage: explicit cities, pincodes, regions,
 * countries, radius or remote, never worldwide. These are vendor-level areas
 * (not tied to one listing). Owner only; another owner's vendor is a 404.
 */
@Injectable()
export class ServiceAreasService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async list(
    user: AuthenticatedUser,
    vendorId: string,
  ): Promise<ServiceAreaView[]> {
    await this.requireOwned(vendorId, user.userId);
    const result = await this.database.query<AreaRow>(
      `${AREA_SELECT}
       WHERE a.vendor_id = $1 AND a.listing_id IS NULL
       ORDER BY a.created_at, a.id`,
      [vendorId],
    );
    return result.rows.map(toView);
  }

  async add(
    user: AuthenticatedUser,
    vendorId: string,
    request: CreateServiceAreaDto,
  ): Promise<ServiceAreaView> {
    try {
      const id = await this.database.transaction(async (client) => {
        const owned = await client.query(
          `SELECT 1 FROM vendors WHERE id = $1 AND owner_user_id = $2
           FOR UPDATE`,
          [vendorId, user.userId],
        );
        if (owned.rowCount !== 1) {
          throw new NotFoundException("No such vendor for this user");
        }
        const country = await this.resolveCountry(client, request);
        const values = [
          vendorId,
          request.coverageType,
          country,
          request.coverageType === "region" ? request.regionId : null,
          request.coverageType === "city" ? request.cityId : null,
          request.coverageType === "pincode" ? request.postalCode : null,
          request.coverageType === "radius" ? request.radiusKm : null,
          request.coverageType === "radius" ? request.latitude : null,
          request.coverageType === "radius" ? request.longitude : null,
        ] as Array<string | number | null | undefined>;
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO service_areas
             (vendor_id, coverage_type, country_id, region_id, city_id,
              postal_code, radius_km, center_latitude, center_longitude)
           SELECT $1::uuid, $2::text, $3::uuid, $4::uuid, $5::uuid, $6::text,
                  $7::numeric, $8::numeric, $9::numeric
           WHERE NOT EXISTS (
             SELECT 1 FROM service_areas
             WHERE vendor_id = $1::uuid AND listing_id IS NULL
               AND coverage_type = $2::text
               AND country_id IS NOT DISTINCT FROM $3::uuid
               AND region_id IS NOT DISTINCT FROM $4::uuid
               AND city_id IS NOT DISTINCT FROM $5::uuid
               AND postal_code IS NOT DISTINCT FROM $6::text
               AND radius_km IS NOT DISTINCT FROM $7::numeric
               AND center_latitude IS NOT DISTINCT FROM $8::numeric
               AND center_longitude IS NOT DISTINCT FROM $9::numeric
           )
           RETURNING id`,
          values.map((value) => value ?? null) as Array<string | number | null>,
        );
        const row = inserted.rows[0];
        if (!row) {
          throw new ConflictException("That coverage is already declared");
        }
        await this.audit.record(
          {
            actorUserId: user.userId,
            action: "vendor.service_area_add",
            targetType: "vendor",
            targetId: vendorId,
            metadata: {
              serviceAreaId: row.id,
              coverageType: request.coverageType,
            },
          },
          client,
        );
        return row.id;
      });
      return await this.getOne(vendorId, id);
    } catch (error) {
      if ((error as { code?: string }).code === FOREIGN_KEY_VIOLATION) {
        throw new BadRequestException("Unknown city or region");
      }
      throw error;
    }
  }

  async remove(
    user: AuthenticatedUser,
    vendorId: string,
    areaId: string,
  ): Promise<void> {
    await this.database.transaction(async (client) => {
      const result = await client.query(
        `DELETE FROM service_areas AS a
         USING vendors AS v
         WHERE a.id = $1 AND a.vendor_id = $2 AND a.listing_id IS NULL
           AND v.id = a.vendor_id AND v.owner_user_id = $3`,
        [areaId, vendorId, user.userId],
      );
      if (result.rowCount !== 1) {
        throw new NotFoundException("No such service area for this vendor");
      }
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "vendor.service_area_remove",
          targetType: "vendor",
          targetId: vendorId,
          metadata: { serviceAreaId: areaId },
        },
        client,
      );
    });
  }

  private async requireOwned(vendorId: string, userId: string): Promise<void> {
    const owned = await this.database.query(
      `SELECT 1 FROM vendors WHERE id = $1 AND owner_user_id = $2`,
      [vendorId, userId],
    );
    if (owned.rowCount !== 1) {
      throw new NotFoundException("No such vendor for this user");
    }
  }

  private async getOne(
    vendorId: string,
    areaId: string,
  ): Promise<ServiceAreaView> {
    const result = await this.database.query<AreaRow>(
      `${AREA_SELECT} WHERE a.id = $1 AND a.vendor_id = $2`,
      [areaId, vendorId],
    );
    return toView(result.rows[0]);
  }

  /** Pincode and country coverage name a country; a bad code is a 400. */
  private async resolveCountry(
    client: PoolClient,
    request: CreateServiceAreaDto,
  ): Promise<string | null> {
    if (
      request.coverageType !== "pincode" &&
      request.coverageType !== "country"
    ) {
      return null;
    }
    const country = await client.query<{ id: string }>(
      `SELECT id FROM countries WHERE iso_code = $1`,
      [request.countryCode ?? ""],
    );
    const id = country.rows[0]?.id;
    if (!id) {
      throw new BadRequestException("countryCode is not supported");
    }
    return id;
  }
}

function toView(row: AreaRow): ServiceAreaView {
  const number = (value: string | null) =>
    value === null ? null : Number(value);
  return {
    id: row.id,
    coverageType: row.coverage_type,
    countryCode: row.country_code,
    regionId: row.region_id,
    regionName: row.region_name,
    cityId: row.city_id,
    cityName: row.city_name,
    postalCode: row.postal_code,
    radiusKm: number(row.radius_km),
    latitude: number(row.center_latitude),
    longitude: number(row.center_longitude),
  };
}
