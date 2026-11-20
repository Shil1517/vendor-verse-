import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
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

export interface PincodeLookupView {
  postalCode: string;
  countryCode: string;
  /** State and district exactly as the postal directory states them. */
  state: string;
  district: string;
  /** Post-office / area names for the pincode (at most 10). */
  areas: string[];
  /** The region and city of our own hierarchy this pincode falls in, or null when we do not cover it. */
  region: RegionView | null;
  city: CityView | null;
  /** True only when the pincode maps to a city we have in the hierarchy. Live status is on `city`. */
  supported: boolean;
}

export type PincodeFetch = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

const PINCODE_IN = /^[1-9][0-9]{5}$/;
const PINCODE_TIMEOUT_MS = 5000;
const PINCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const PINCODE_CACHE_MAX = 5000;
const INDIA_POST_URL = "https://api.postalpincode.in/pincode/";

interface PostOffice {
  Name?: string;
  District?: string;
  State?: string;
}

const norm = (value: string) => value.trim().toLowerCase();
const withoutNcr = (value: string) => norm(value).replace(/\s+ncr$/, "");

/**
 * F-GEO-01 location hierarchy reads (country > state > city > locality) with
 * the launch status of each city (F-GEO-02). Public, read-only reference data.
 * The status comes from the city's own market_activations row; a country-wide
 * row does not make every city live.
 */
@Injectable()
export class GeoService {
  /** Replaceable in tests; the pincode directory is an external HTTP service (India Post). */
  pincodeFetch: PincodeFetch = (url, init) => globalThis.fetch(url, init);
  private readonly pincodeCache = new Map<
    string,
    { at: number; offices: PostOffice[] }
  >();

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

  /**
   * F-GEO-01: detect state, district and city from a pincode. India only for now.
   * The directory is India Post; the answer is matched to our own regions and cities, and a
   * pincode in a place we do not cover is reported as such, never guessed.
   */
  async lookupPincode(
    countryCode: string,
    pincode: string,
  ): Promise<PincodeLookupView> {
    if (countryCode !== "IN") {
      throw new BadRequestException(
        "Pincode lookup is only available for India (IN)",
      );
    }
    if (!PINCODE_IN.test(pincode)) {
      throw new BadRequestException(
        "pincode must be a six-digit Indian pincode",
      );
    }
    const offices = await this.fetchPostOffices(pincode);
    const first = offices[0];
    const state = first.State?.trim() ?? "";
    const district = first.District?.trim() ?? "";
    const areas = [
      ...new Set(
        offices.map((o) => o.Name?.trim()).filter((n): n is string => !!n),
      ),
    ].slice(0, 10);

    const [regions, cities] = await Promise.all([
      this.listRegions(countryCode),
      this.listCities(countryCode),
    ]);
    const region = regions.find((r) => norm(r.name) === norm(state)) ?? null;
    const city =
      cities.find(
        (c) =>
          (!region || c.regionId === region.id) &&
          (withoutNcr(c.name) === norm(district) ||
            withoutNcr(c.name) === norm(state)),
      ) ?? null;
    return {
      postalCode: pincode,
      countryCode,
      state,
      district,
      areas,
      region,
      city,
      supported: city !== null,
    };
  }

  private async fetchPostOffices(pincode: string): Promise<PostOffice[]> {
    const cached = this.pincodeCache.get(pincode);
    if (cached && Date.now() - cached.at < PINCODE_CACHE_TTL_MS) {
      return cached.offices;
    }
    let body: unknown;
    try {
      const response = await this.pincodeFetch(
        `${INDIA_POST_URL}${encodeURIComponent(pincode)}`,
        { signal: AbortSignal.timeout(PINCODE_TIMEOUT_MS) },
      );
      if (!response.ok) throw new Error(`status ${response.status}`);
      body = await response.json();
    } catch {
      throw new ServiceUnavailableException(
        "The pincode directory is not reachable right now. Choose your city instead.",
      );
    }
    const entry = Array.isArray(body)
      ? (body[0] as Record<string, unknown> | undefined)
      : undefined;
    const offices = Array.isArray(entry?.PostOffice)
      ? (entry.PostOffice as PostOffice[])
      : [];
    if (entry?.Status !== "Success" || !offices.length) {
      throw new NotFoundException("No such pincode");
    }
    if (this.pincodeCache.size >= PINCODE_CACHE_MAX) this.pincodeCache.clear();
    this.pincodeCache.set(pincode, { at: Date.now(), offices });
    return offices;
  }
}
