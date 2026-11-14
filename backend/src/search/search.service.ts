import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import {
  DiscoverService,
  SearchItem,
  likePattern,
} from "../discover/discover.service";
import { SearchListingsQueryDto } from "../discover/dto/discover.dto";
import {
  PRIVATE_SEARCH_TYPES,
  PUBLIC_SEARCH_TYPES,
  SearchType,
  UNIVERSAL_DEFAULT_LIMIT,
  UniversalSearchQueryDto,
} from "./dto/search.dto";

type PrivateType = (typeof PRIVATE_SEARCH_TYPES)[number];

export interface Section<T> {
  items: T[];
  nextCursor: string | null;
}

export interface CategoryHit {
  id: string;
  name: string;
  industryId: string;
  matchedOn: string[];
}

export interface VendorHit {
  id: string;
  name: string;
  roles: string[];
  matchedOn: string[];
}

/** A record the caller is a party to (D-025). Never carries the other side's identity. */
export interface PrivateHit {
  id: string;
  /** The caller's side of the record. */
  role: "customer" | "vendor" | "buyer" | "supplier";
  state: string;
  title: string | null;
  categoryName: string | null;
  matchedOn: string[];
}

export interface UniversalSearchResult {
  q: string;
  /** False when the market is not live: no public result is returned there. */
  marketLive: boolean;
  signedIn: boolean;
  sections: Partial<{
    product: Section<SearchItem>;
    service: Section<SearchItem>;
    vendor: Section<VendorHit>;
    category: Section<CategoryHit>;
    rfq: Section<PrivateHit>;
    booking: Section<PrivateHit>;
    contract: Section<PrivateHit>;
    purchase_order: Section<PrivateHit>;
  }>;
}

interface PrivateRow {
  id: string;
  role: PrivateHit["role"];
  state: string;
  title: string | null;
  category_name: string | null;
  hits: string[];
}

type Place = Pick<
  UniversalSearchQueryDto,
  "countryCode" | "cityId" | "regionId" | "postalCode"
>;

const isPrivateType = (type: SearchType): type is PrivateType =>
  (PRIVATE_SEARCH_TYPES as readonly string[]).includes(type);

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

/** True when any top-level string value of a jsonb object contains the pattern. */
const jsonTextHit = (column: string, pattern: string): string =>
  `EXISTS (SELECT 1 FROM jsonb_each_text(${column}) AS kv
           WHERE jsonb_typeof(${column} -> kv.key) = 'string'
             AND kv.value ILIKE ${pattern})`;

const VENDOR_NAME = `COALESCE(vp.trading_name, v.legal_name, '')`;

/** The category name at its current configuration version. */
const CATEGORY_JOIN = (categoryColumn: string) => `
  LEFT JOIN categories AS cat ON cat.id = ${categoryColumn}
  LEFT JOIN category_config_versions AS cfg
    ON cfg.category_id = cat.id AND cfg.version_number = cat.current_version`;

/**
 * Private queries. Parameters: $1 caller, $2 LIKE pattern, $3 limit + 1,
 * $4 offset. Each WHERE keeps only records the caller is a party to.
 */
const PRIVATE_QUERIES: Record<PrivateType, string> = {
  // Customer: always. Vendor: only an invited vendor's own recipient row, and
  // never a draft (F-BKG-08, PRS 8.5: vendors never see competing RFQs).
  rfq: `
    SELECT r.id, r.state, cfg.name AS category_name,
           CASE WHEN jsonb_typeof(rev.requirements -> 'title') = 'string'
                THEN rev.requirements ->> 'title' END AS title,
           CASE WHEN r.customer_user_id = $1 THEN 'customer' ELSE 'vendor' END AS role,
           array_remove(ARRAY[
             CASE WHEN cfg.name ILIKE $2 THEN 'category' END,
             CASE WHEN ${jsonTextHit("rev.requirements", "$2")} THEN 'requirements' END
           ], NULL) AS hits
    FROM rfqs AS r
    JOIN rfq_revisions AS rev
      ON rev.rfq_id = r.id AND rev.revision_number = r.current_revision
    ${CATEGORY_JOIN("r.category_id")}
    WHERE (r.customer_user_id = $1
           OR (r.state <> 'draft' AND EXISTS (
                 SELECT 1 FROM rfq_recipients AS rr
                 JOIN vendors AS rv ON rv.id = rr.vendor_id
                 WHERE rr.rfq_id = r.id AND rv.owner_user_id = $1)))
      AND (cfg.name ILIKE $2 OR ${jsonTextHit("rev.requirements", "$2")})
    ORDER BY r.updated_at DESC, r.id
    LIMIT $3 OFFSET $4`,

  booking: `
    SELECT b.id, b.state, cfg.name AS category_name, l.title,
           CASE WHEN b.customer_user_id = $1 THEN 'customer' ELSE 'vendor' END AS role,
           array_remove(ARRAY[
             CASE WHEN l.title ILIKE $2 THEN 'listing' END,
             CASE WHEN ${VENDOR_NAME} ILIKE $2 THEN 'vendor' END,
             CASE WHEN cfg.name ILIKE $2 THEN 'category' END
           ], NULL) AS hits
    FROM bookings AS b
    JOIN listings AS l ON l.id = b.listing_id
    JOIN vendors AS v ON v.id = b.vendor_id
    LEFT JOIN vendor_profiles AS vp ON vp.vendor_id = v.id
    ${CATEGORY_JOIN("l.category_id")}
    WHERE (b.customer_user_id = $1
           OR (b.state <> 'draft' AND v.owner_user_id = $1))
      AND (l.title ILIKE $2 OR ${VENDOR_NAME} ILIKE $2 OR cfg.name ILIKE $2)
    ORDER BY b.updated_at DESC, b.id
    LIMIT $3 OFFSET $4`,

  // A draft is visible only to the party that proposed it.
  contract: `
    SELECT c.id, c.state, cfg.name AS category_name,
           CASE WHEN jsonb_typeof(cv.scope -> 'title') = 'string'
                THEN cv.scope ->> 'title' END AS title,
           CASE WHEN c.customer_user_id = $1 THEN 'customer' ELSE 'vendor' END AS role,
           array_remove(ARRAY[
             CASE WHEN ${VENDOR_NAME} ILIKE $2 THEN 'vendor' END,
             CASE WHEN cfg.name ILIKE $2 THEN 'category' END,
             CASE WHEN ${jsonTextHit("cv.scope", "$2")} THEN 'scope' END
           ], NULL) AS hits
    FROM contracts AS c
    JOIN contract_versions AS cv
      ON cv.contract_id = c.id AND cv.version_number = c.current_version
    JOIN vendors AS v ON v.id = c.vendor_id
    LEFT JOIN vendor_profiles AS vp ON vp.vendor_id = v.id
    ${CATEGORY_JOIN("c.category_id")}
    WHERE (c.customer_user_id = $1 OR v.owner_user_id = $1)
      AND (c.state <> 'draft' OR c.proposer_user_id = $1)
      AND (${VENDOR_NAME} ILIKE $2 OR cfg.name ILIKE $2
           OR ${jsonTextHit("cv.scope", "$2")})
    ORDER BY c.updated_at DESC, c.id
    LIMIT $3 OFFSET $4`,

  purchase_order: `
    SELECT p.id, p.state, NULL::text AS category_name,
           (SELECT pl.description FROM po_lines AS pl
            WHERE pl.purchase_order_id = p.id ORDER BY pl.line_number LIMIT 1) AS title,
           CASE WHEN p.buyer_user_id = $1 OR bv.owner_user_id = $1
                THEN 'buyer' ELSE 'supplier' END AS role,
           array_remove(ARRAY[
             CASE WHEN EXISTS (SELECT 1 FROM po_lines AS pl
                               WHERE pl.purchase_order_id = p.id
                                 AND pl.description ILIKE $2) THEN 'item' END,
             CASE WHEN ${VENDOR_NAME} ILIKE $2 THEN 'vendor' END
           ], NULL) AS hits
    FROM purchase_orders AS p
    JOIN vendors AS v ON v.id = p.supplier_vendor_id
    LEFT JOIN vendor_profiles AS vp ON vp.vendor_id = v.id
    LEFT JOIN vendors AS bv ON bv.id = p.buyer_vendor_id
    WHERE (p.buyer_user_id = $1 OR bv.owner_user_id = $1 OR v.owner_user_id = $1)
      AND (${VENDOR_NAME} ILIKE $2
           OR EXISTS (SELECT 1 FROM po_lines AS pl
                      WHERE pl.purchase_order_id = p.id AND pl.description ILIKE $2))
    ORDER BY p.updated_at DESC, p.id
    LIMIT $3 OFFSET $4`,
};

/**
 * F-DSC-02 universal search (D-025).
 *
 * Public sections reuse DiscoverService, so eligibility, live-market and
 * organic-ranking rules are the same as GET /discover/listings. Private
 * sections run only for a signed-in caller and each query is scoped to the
 * records the caller is a party to (customer, buyer, or owner of the vendor
 * on the record). A record never matches on another party's private data and
 * the other party's identity is not returned.
 */
@Injectable()
export class SearchService {
  constructor(
    private readonly database: DatabaseService,
    private readonly discover: DiscoverService,
  ) {}

  async search(
    request: UniversalSearchQueryDto,
    user: AuthenticatedUser | undefined,
  ): Promise<UniversalSearchResult> {
    const requested = request.types;
    if (!user && requested?.some(isPrivateType)) {
      throw new UnauthorizedException(
        "Sign in to search your own RFQs, bookings, contracts and purchase orders",
      );
    }
    const types: SearchType[] = requested ?? [
      ...PUBLIC_SEARCH_TYPES,
      ...(user ? PRIVATE_SEARCH_TYPES : []),
    ];
    if (types.length === 0) {
      throw new BadRequestException("types must not be empty");
    }
    if (request.cursor && types.length !== 1) {
      throw new BadRequestException(
        "cursor can only be used when exactly one type is requested",
      );
    }
    const limit = request.limit ?? UNIVERSAL_DEFAULT_LIMIT;
    const offset = decodeCursor(request.cursor);
    const pattern = likePattern(request.q);

    const result: UniversalSearchResult = {
      q: request.q,
      marketLive: true,
      signedIn: Boolean(user),
      sections: {},
    };

    const publicTypes = types.filter((type) => !isPrivateType(type));
    if (publicTypes.length > 0) {
      result.marketLive = await this.searchPublic(
        request,
        publicTypes,
        limit,
        offset,
        pattern,
        result,
      );
    }

    if (user) {
      for (const type of types.filter(isPrivateType)) {
        result.sections[type] = await this.searchPrivate(
          type,
          user.userId,
          pattern,
          limit,
          offset,
        );
      }
    }
    return result;
  }

  private listingQuery(
    place: Place,
    extra: Partial<SearchListingsQueryDto>,
  ): SearchListingsQueryDto {
    return Object.assign(new SearchListingsQueryDto(), place, extra);
  }

  private async searchPublic(
    request: UniversalSearchQueryDto,
    types: SearchType[],
    limit: number,
    offset: number,
    pattern: string,
    result: UniversalSearchResult,
  ): Promise<boolean> {
    const place: Place = {
      countryCode: request.countryCode,
      cityId: request.cityId,
      regionId: request.regionId,
      postalCode: request.postalCode,
    };
    const market = await this.discover.resolveMarket(place);
    if (!market.live) {
      for (const type of types) {
        if (!isPrivateType(type)) {
          result.sections[type] = { items: [], nextCursor: null };
        }
      }
      return false;
    }

    for (const type of types) {
      if (type === "product" || type === "service") {
        const page = await this.discover.search(
          this.listingQuery(place, {
            q: request.q,
            listingType: type,
            limit,
            cursor: request.cursor,
          }),
        );
        result.sections[type] = {
          items: page.items,
          nextCursor: page.nextCursor,
        };
      } else if (type === "vendor") {
        result.sections.vendor = await this.searchVendors(
          place,
          request.q,
          limit,
        );
      } else if (type === "category") {
        result.sections.category = await this.searchCategories(
          place,
          market.regionId,
          pattern,
          limit,
          offset,
        );
      }
    }
    return true;
  }

  /**
   * Vendors come from the best eligible listing matches whose vendor name hit,
   * so a vendor with no eligible, in-coverage listing never appears (F-DSC-02).
   * It reads one listing page, so this section is not paged.
   */
  private async searchVendors(
    place: Place,
    q: string,
    limit: number,
  ): Promise<Section<VendorHit>> {
    const page = await this.discover.search(
      this.listingQuery(place, { q, limit: 50 }),
    );
    const seen = new Map<string, VendorHit>();
    for (const item of page.items) {
      if (item.matchedOn.includes("vendor") && !seen.has(item.vendor.id)) {
        seen.set(item.vendor.id, {
          id: item.vendor.id,
          name: item.vendor.name,
          roles: item.vendor.roles,
          matchedOn: item.matchedOn,
        });
      }
    }
    return { items: [...seen.values()].slice(0, limit), nextCursor: null };
  }

  private async searchCategories(
    place: Place,
    regionId: string | null,
    pattern: string,
    limit: number,
    offset: number,
  ): Promise<Section<CategoryHit>> {
    const enabled = await this.discover.enabledCategoryIds(place, regionId);
    if (enabled.length === 0) {
      return { items: [], nextCursor: null };
    }
    const nameHit = `cfg.name ILIKE $2`;
    const aliasHit = `EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(cfg.aliases) = 'array' THEN cfg.aliases ELSE '[]'::jsonb END) AS a(alias)
      WHERE a.alias ILIKE $2)`;
    const rows = await this.database.query<{
      id: string;
      industry_id: string;
      name: string;
      name_hit: boolean;
      alias_hit: boolean;
    }>(
      `SELECT cat.id, cat.industry_id, cfg.name,
              (${nameHit}) AS name_hit, (${aliasHit}) AS alias_hit
       FROM categories AS cat
       JOIN category_config_versions AS cfg
         ON cfg.category_id = cat.id AND cfg.version_number = cat.current_version
       WHERE cat.id = ANY($1::uuid[]) AND (${nameHit} OR ${aliasHit})
       ORDER BY (${nameHit}) DESC, cfg.name, cat.id
       LIMIT $3 OFFSET $4`,
      [enabled, pattern, limit + 1, offset],
    );
    return {
      items: rows.rows.slice(0, limit).map((row) => ({
        id: row.id,
        name: row.name,
        industryId: row.industry_id,
        matchedOn: [
          ...(row.name_hit ? ["name"] : []),
          ...(row.alias_hit ? ["alias"] : []),
        ],
      })),
      nextCursor:
        rows.rows.length > limit ? encodeCursor(offset + limit) : null,
    };
  }

  private async searchPrivate(
    type: PrivateType,
    userId: string,
    pattern: string,
    limit: number,
    offset: number,
  ): Promise<Section<PrivateHit>> {
    const rows = await this.database.query<PrivateRow>(PRIVATE_QUERIES[type], [
      userId,
      pattern,
      limit + 1,
      offset,
    ]);
    return {
      items: rows.rows.slice(0, limit).map((row) => ({
        id: row.id,
        role: row.role,
        state: row.state,
        title: row.title,
        categoryName: row.category_name,
        matchedOn: row.hits,
      })),
      nextCursor:
        rows.rows.length > limit ? encodeCursor(offset + limit) : null,
    };
  }
}
