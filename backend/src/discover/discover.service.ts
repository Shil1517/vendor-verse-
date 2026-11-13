import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { isEnabledInMarket } from "../taxonomy/market-eligibility";
import {
  SEARCH_DEFAULT_LIMIT,
  SearchListingsQueryDto,
} from "./dto/discover.dto";
import {
  LISTING_ELIGIBLE_JOINS,
  LISTING_ELIGIBLE_SQL,
} from "./listing-eligibility";

export type PriceState = "stated" | "on_request" | "not_provided";

export interface PriceView {
  state: PriceState;
  minMinor: number | null;
  maxMinor: number | null;
  currency: string | null;
  unit: string | null;
}

export type CoverageLevel = "city" | "region" | "country" | "remote";

export interface SearchItem {
  id: string;
  title: string;
  listingType: "service" | "product";
  categoryId: string;
  categoryName: string;
  vendor: { id: string; name: string; roles: string[] };
  price: PriceView;
  instantBooking: boolean;
  /** Why it matched: coverage level plus any text field that hit (F-DSC-02). */
  matchedOn: string[];
}

export interface SearchResult {
  items: SearchItem[];
  nextCursor: string | null;
  /** False when the market is not live: nothing is publicly searchable there. */
  marketLive: boolean;
}

interface SearchRow {
  id: string;
  title: string;
  listing_type: "service" | "product";
  category_id: string;
  category_name: string;
  vendor_id: string;
  vendor_name: string | null;
  roles: string[] | null;
  price_on_request: boolean;
  price_min_minor: string | null;
  price_max_minor: string | null;
  price_currency: string | null;
  price_unit: string | null;
  instant_booking_enabled: boolean;
  coverage_rank: number;
  title_hit: boolean;
  description_hit: boolean;
  vendor_hit: boolean;
}

const COVERAGE_BY_RANK: Record<number, CoverageLevel> = {
  1: "city",
  2: "region",
  3: "country",
  4: "remote",
};

/** Escapes LIKE wildcards so user text is matched literally. */
export const likePattern = (text: string): string =>
  `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export function priceView(row: {
  price_on_request: boolean;
  price_min_minor: string | null;
  price_max_minor: string | null;
  price_currency: string | null;
  price_unit: string | null;
}): PriceView {
  const min = row.price_min_minor === null ? null : Number(row.price_min_minor);
  const max = row.price_max_minor === null ? null : Number(row.price_max_minor);
  const stated = min !== null || max !== null;
  return {
    state: row.price_on_request
      ? "on_request"
      : stated
        ? "stated"
        : "not_provided",
    minMinor: min,
    maxMinor: max,
    currency: stated ? row.price_currency : null,
    unit: stated ? row.price_unit : null,
  };
}

const encodeCursor = (offset: number): string =>
  Buffer.from(String(offset)).toString("base64url");

function decodeCursor(cursor: string | undefined): number {
  if (!cursor) {
    return 0;
  }
  const offset = Number(Buffer.from(cursor, "base64url").toString());
  if (!Number.isInteger(offset) || offset < 0) {
    throw new BadRequestException("cursor is not valid");
  }
  return offset;
}

/**
 * F-DSC-02 / F-DSC-04 / F-DSC-05 public discovery. Only eligible listings are
 * returned (see LISTING_ELIGIBLE_SQL) and only in a live market (F-GEO-03).
 * Ranking is organic: plan tier and sponsorship are not signals (GM-21, GM-22).
 * Missing data stays missing: a price that was not provided is `not_provided`,
 * never zero (F-DSC-05).
 */
@Injectable()
export class DiscoverService {
  constructor(private readonly database: DatabaseService) {}

  async search(query: SearchListingsQueryDto): Promise<SearchResult> {
    const market = await this.resolveMarket(query);
    if (!market.live) {
      return { items: [], nextCursor: null, marketLive: false };
    }

    const categoryIds = await this.enabledCategoryIds(query, market.regionId);
    if (categoryIds.length === 0) {
      return { items: [], nextCursor: null, marketLive: true };
    }

    const limit = query.limit ?? SEARCH_DEFAULT_LIMIT;
    const offset = decodeCursor(query.cursor);
    const values: Array<string | number | boolean | string[] | null> = [];
    const bind = (value: string | number | boolean | string[] | null) => {
      values.push(value);
      return `$${values.length}`;
    };

    const country = bind(market.countryId);
    const city = bind(market.cityId);
    const region = bind(market.regionId);
    const postal = bind(query.postalCode ?? null);
    const categories = bind(categoryIds);

    // Best coverage match for this listing in the searched place.
    const coverage = `(
      SELECT min(CASE
          WHEN sa.coverage_type = 'city' THEN 1
          WHEN sa.coverage_type = 'pincode' THEN 1
          WHEN sa.coverage_type = 'region' THEN 2
          WHEN sa.coverage_type = 'country' THEN 3
          ELSE 4 END)
      FROM service_areas AS sa
      LEFT JOIN cities AS sc ON sc.id = sa.city_id
      LEFT JOIN regions AS sr ON sr.id = sa.region_id
      WHERE sa.vendor_id = l.vendor_id
        AND (sa.listing_id = l.id OR sa.listing_id IS NULL)
        AND (
          sa.coverage_type = 'remote'
          OR (sa.coverage_type = 'city'
              AND (
                (${city}::uuid IS NULL
                 AND COALESCE(sc.country_id, sa.country_id) = ${country}::uuid
                 AND (${region}::uuid IS NULL OR sc.region_id = ${region}::uuid))
                OR sa.city_id = ${city}::uuid))
          OR (sa.coverage_type = 'pincode'
              AND sa.country_id = ${country}::uuid
              AND (${postal}::text IS NULL OR sa.postal_code = ${postal}::text))
          OR (sa.coverage_type = 'region'
              AND COALESCE(sr.country_id, sa.country_id) = ${country}::uuid
              AND (${region}::uuid IS NULL OR sa.region_id = ${region}::uuid))
          OR (sa.coverage_type = 'country' AND sa.country_id = ${country}::uuid)
        )
    )`;

    const where: string[] = [
      LISTING_ELIGIBLE_SQL,
      `l.category_id = ANY(${categories}::uuid[])`,
    ];
    let titleHit = "false";
    let descriptionHit = "false";
    let vendorHit = "false";
    if (query.q) {
      const pattern = bind(likePattern(query.q));
      titleHit = `l.title ILIKE ${pattern}`;
      descriptionHit = `COALESCE(l.description, '') ILIKE ${pattern}`;
      vendorHit = `COALESCE(vp.trading_name, v.legal_name, '') ILIKE ${pattern}`;
      where.push(`(${titleHit} OR ${descriptionHit} OR ${vendorHit})`);
    }
    if (query.industryId) {
      where.push(`cat.industry_id = ${bind(query.industryId)}::uuid`);
    }
    if (query.categoryId) {
      where.push(`l.category_id = ${bind(query.categoryId)}::uuid`);
    }
    if (query.subcategoryId) {
      where.push(`l.subcategory_id = ${bind(query.subcategoryId)}::uuid`);
    }
    if (query.listingType) {
      where.push(`l.listing_type = ${bind(query.listingType)}`);
    }
    if (query.vendorRole) {
      where.push(
        `EXISTS (SELECT 1 FROM vendor_roles AS fr
                 WHERE fr.vendor_id = v.id AND fr.status = 'verified'
                   AND fr.role_code = ${bind(query.vendorRole)})`,
      );
    }
    // Price filters only match a stated price: a missing price never counts as 0.
    if (query.minPriceMinor !== undefined) {
      where.push(
        `COALESCE(l.price_max_minor, l.price_min_minor) >= ${bind(query.minPriceMinor)}`,
      );
    }
    if (query.maxPriceMinor !== undefined) {
      where.push(
        `COALESCE(l.price_min_minor, l.price_max_minor) <= ${bind(query.maxPriceMinor)}`,
      );
    }
    if (query.instantOnly) {
      where.push(`l.instant_booking_enabled`);
    }

    const sql = `
      SELECT * FROM (
        SELECT l.id, l.title, l.listing_type, l.category_id,
               cfg.name AS category_name, v.id AS vendor_id,
               COALESCE(vp.trading_name, v.legal_name) AS vendor_name,
               (SELECT array_agg(r.role_code ORDER BY r.role_code)
                FROM vendor_roles AS r
                WHERE r.vendor_id = v.id AND r.status = 'verified') AS roles,
               l.price_on_request, l.price_min_minor, l.price_max_minor,
               l.price_currency, l.price_unit, l.instant_booking_enabled,
               l.updated_at,
               ${coverage} AS coverage_rank,
               (${titleHit}) AS title_hit,
               (${descriptionHit}) AS description_hit,
               (${vendorHit}) AS vendor_hit
        ${LISTING_ELIGIBLE_JOINS}
        JOIN categories AS cat ON cat.id = l.category_id
        LEFT JOIN vendor_profiles AS vp ON vp.vendor_id = v.id
        WHERE ${where.join("\n          AND ")}
      ) AS matches
      WHERE coverage_rank IS NOT NULL
      ORDER BY coverage_rank, title_hit DESC, vendor_hit DESC, updated_at DESC, id
      LIMIT ${bind(limit + 1)} OFFSET ${bind(offset)}`;

    const result = await this.database.query<SearchRow>(sql, values);
    const page = result.rows.slice(0, limit);
    return {
      marketLive: true,
      nextCursor:
        result.rows.length > limit ? encodeCursor(offset + limit) : null,
      items: page.map((row) => ({
        id: row.id,
        title: row.title,
        listingType: row.listing_type,
        categoryId: row.category_id,
        categoryName: row.category_name,
        vendor: {
          id: row.vendor_id,
          name: row.vendor_name ?? "",
          roles: row.roles ?? [],
        },
        price: priceView(row),
        instantBooking: row.instant_booking_enabled,
        matchedOn: [
          `coverage:${COVERAGE_BY_RANK[row.coverage_rank]}`,
          ...(row.title_hit ? ["title"] : []),
          ...(row.description_hit ? ["description"] : []),
          ...(row.vendor_hit ? ["vendor"] : []),
        ],
      })),
    };
  }

  /** One eligible listing for the detail page (F-DSC-05, F-DSC-06). */
  async getListing(listingId: string) {
    const result = await this.database.query<
      SearchRow & {
        description: string | null;
        time_zone: string | null;
        configuration: { bookingModes?: unknown } | null;
        attributes: Record<string, unknown>;
        service_areas: unknown[];
        availability_model: string | null;
        availability_time_zone: string | null;
        vendor_description: string | null;
      }
    >(
      `SELECT l.id, l.title, l.description, l.listing_type, l.category_id,
              cfg.name AS category_name, cfg.configuration, v.id AS vendor_id,
              COALESCE(vp.trading_name, v.legal_name) AS vendor_name,
              vp.description AS vendor_description,
              (SELECT array_agg(r.role_code ORDER BY r.role_code)
               FROM vendor_roles AS r
               WHERE r.vendor_id = v.id AND r.status = 'verified') AS roles,
              l.price_on_request, l.price_min_minor, l.price_max_minor,
              l.price_currency, l.price_unit, l.time_zone,
              l.instant_booking_enabled,
              (SELECT COALESCE(jsonb_object_agg(a.attribute_key, a.value), '{}'::jsonb)
               FROM listing_attributes AS a WHERE a.listing_id = l.id) AS attributes,
              (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'coverageType', sa.coverage_type,
                        'cityId', sa.city_id, 'regionId', sa.region_id,
                        'postalCode', sa.postal_code)), '[]'::jsonb)
               FROM service_areas AS sa
               WHERE sa.vendor_id = l.vendor_id
                 AND (sa.listing_id = l.id OR sa.listing_id IS NULL)) AS service_areas,
              ar.availability_model, ar.time_zone AS availability_time_zone
       ${LISTING_ELIGIBLE_JOINS}
       LEFT JOIN vendor_profiles AS vp ON vp.vendor_id = v.id
       LEFT JOIN availability_rules AS ar ON ar.listing_id = l.id
       WHERE l.id = $1 AND ${LISTING_ELIGIBLE_SQL}`,
      [listingId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("No such listing");
    }
    const bookingModes = row.configuration?.bookingModes;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      listingType: row.listing_type,
      categoryId: row.category_id,
      categoryName: row.category_name,
      vendor: {
        id: row.vendor_id,
        name: row.vendor_name ?? "",
        description: row.vendor_description,
        roles: row.roles ?? [],
      },
      price: priceView(row),
      instantBooking: row.instant_booking_enabled,
      timeZone: row.time_zone,
      attributes: row.attributes,
      serviceAreas: row.service_areas,
      bookingModes: Array.isArray(bookingModes) ? bookingModes : null,
      // Shown only when the vendor provided it; never inferred (F-VND-08).
      availability: row.availability_model
        ? {
            state: "provided",
            model: row.availability_model,
            timeZone: row.availability_time_zone,
          }
        : { state: "not_provided" },
    };
  }

  private async resolveMarket(query: SearchListingsQueryDto): Promise<{
    countryId: string | null;
    cityId: string | null;
    regionId: string | null;
    live: boolean;
  }> {
    const country = await this.database.query<{ id: string }>(
      `SELECT id FROM countries WHERE iso_code = $1`,
      [query.countryCode],
    );
    const countryId = country.rows[0]?.id ?? null;
    if (!countryId) {
      return { countryId: null, cityId: null, regionId: null, live: false };
    }
    let regionId = query.regionId ?? null;
    if (query.cityId) {
      const city = await this.database.query<{ region_id: string | null }>(
        `SELECT region_id FROM cities WHERE id = $1 AND country_id = $2`,
        [query.cityId, countryId],
      );
      if (city.rowCount !== 1) {
        throw new BadRequestException("cityId is not in that country");
      }
      regionId = city.rows[0].region_id;
    }
    // A city-specific activation overrides the country-wide one (F-GEO-03).
    const status = await this.database.query<{ status: string }>(
      `SELECT COALESCE(
         (SELECT status FROM market_activations WHERE city_id = $2),
         (SELECT status FROM market_activations
          WHERE country_id = $1 AND city_id IS NULL)) AS status`,
      [countryId, query.cityId ?? null],
    );
    return {
      countryId,
      cityId: query.cityId ?? null,
      regionId,
      live: status.rows[0]?.status === "live",
    };
  }

  /** Active categories whose marketRules enable them in the searched market. */
  private async enabledCategoryIds(
    query: SearchListingsQueryDto,
    regionId: string | null,
  ): Promise<string[]> {
    const categories = await this.database.query<{
      id: string;
      rules: unknown;
    }>(
      `SELECT c.id, v.configuration -> 'marketRules' AS rules
       FROM categories AS c
       JOIN category_config_versions AS v
         ON v.category_id = c.id AND v.version_number = c.current_version
       WHERE c.lifecycle = 'ACTIVE'`,
    );
    return categories.rows
      .filter((row) =>
        isEnabledInMarket(row.rules, {
          countryCode: query.countryCode,
          regionId: regionId ?? undefined,
          cityId: query.cityId,
        }),
      )
      .map((row) => row.id);
  }
}
