import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

export interface CountryView {
  code: string;
  name: string;
}

export interface RegionView {
  id: string;
  name: string;
  type: string | null;
}

export interface CityView {
  id: string;
  name: string;
  regionId: string | null;
  timeZone: string;
  /** F-GEO-02: only a market an admin activated is "live"; everything else is not_live. */
  launchStatus: "live" | "not_live";
}

export interface LocalityView {
  id: string;
  name: string;
  postalCode: string | null;
}

/**
 * F-GEO-01 location hierarchy reads (country > state > city > locality) with
 * the launch status of each city (F-GEO-02). Public, read-only reference data.
 * The status comes from the city's own market_activations row; a country-wide
 * row does not make every city live.
 */
@Injectable()
export class GeoService {
  constructor(private readonly database: DatabaseService) {}

  async listCountries(): Promise<CountryView[]> {
    const result = await this.database.query<CountryView>(
      `SELECT iso_code AS code, name FROM countries ORDER BY name, iso_code`,
    );
    return result.rows;
  }

  async listRegions(countryCode: string): Promise<RegionView[]> {
    const result = await this.database.query<RegionView>(
      `SELECT r.id, r.name, r.region_type AS type
       FROM regions AS r
       JOIN countries AS c ON c.id = r.country_id
       WHERE c.iso_code = $1
       ORDER BY r.name, r.id`,
      [countryCode],
    );
    return result.rows;
  }

  async listCities(
    countryCode: string,
    regionId?: string,
  ): Promise<CityView[]> {
    const result = await this.database.query<{
      id: string;
      name: string;
      region_id: string | null;
      time_zone: string;
      is_live: boolean;
    }>(
      `SELECT ci.id, ci.name, ci.region_id, ci.time_zone,
              COALESCE(m.status = 'live', false) AS is_live
       FROM cities AS ci
       JOIN countries AS c ON c.id = ci.country_id
       LEFT JOIN market_activations AS m ON m.city_id = ci.id
       WHERE c.iso_code = $1
         AND ($2::uuid IS NULL OR ci.region_id = $2::uuid)
       ORDER BY ci.name, ci.id`,
      [countryCode, regionId ?? null],
    );
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      regionId: row.region_id,
      timeZone: row.time_zone,
      launchStatus: row.is_live ? "live" : "not_live",
    }));
  }

  async listLocalities(cityId: string): Promise<LocalityView[]> {
    const result = await this.database.query<{
      id: string;
      name: string;
      postal_code: string | null;
    }>(
      `SELECT id, name, postal_code
       FROM localities
       WHERE city_id = $1
       ORDER BY name, id`,
      [cityId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      postalCode: row.postal_code,
    }));
  }
}
