import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PoolClient } from "pg";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { CreateListingMediaDto } from "./dto/listing-review.dto";
import {
  CreateListingDto,
  ListingType,
  UpdateListingDto,
} from "./dto/listing.dto";

export type ContentState =
  | "draft"
  | "pending_review"
  | "approved"
  | "changes_requested"
  | "rejected"
  | "paused"
  | "unpublished";

export type ListingAction = "submit" | "pause" | "resume" | "unpublish";

export interface ListingView {
  id: string;
  vendorId: string;
  categoryId: string;
  subcategoryId: string | null;
  configVersion: number;
  listingType: ListingType;
  title: string;
  description: string | null;
  contentState: ContentState;
  priceOnRequest: boolean;
  priceMinMinor: number | null;
  priceMaxMinor: number | null;
  priceCurrency: string | null;
  priceUnit: string | null;
  timeZone: string | null;
  attributes: Record<string, unknown>;
  media: ListingMediaView[];
  createdAt: string;
  updatedAt: string;
}

export interface ListingMediaView {
  id: string;
  fileId: string;
  mediaType: "photo" | "portfolio";
  caption: string | null;
  sortOrder: number;
  moderationState: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface ListingRow {
  id: string;
  vendor_id: string;
  category_id: string;
  subcategory_id: string | null;
  config_version_number: number;
  listing_type: ListingType;
  title: string;
  description: string | null;
  content_state: ContentState;
  price_on_request: boolean;
  price_min_minor: string | null;
  price_max_minor: string | null;
  price_currency: string | null;
  price_unit: string | null;
  time_zone: string | null;
  attributes: Record<string, unknown> | null;
  media: Array<{
    id: string;
    fileId: string;
    mediaType: "photo" | "portfolio";
    caption: string | null;
    sortOrder: number;
    moderationState: "pending" | "approved" | "rejected";
    createdAt: string | Date;
  }> | null;
  created_at: Date;
  updated_at: Date;
}

const FOREIGN_KEY_VIOLATION = "23503";
const CHECK_VIOLATION = "23514";

const LISTING_SELECT = `SELECT l.id, l.vendor_id, l.category_id, l.subcategory_id,
        l.config_version_number, l.listing_type, l.title, l.description,
        l.content_state, l.price_on_request, l.price_min_minor,
        l.price_max_minor, l.price_currency, l.price_unit, l.time_zone,
        l.created_at, l.updated_at,
        (SELECT COALESCE(jsonb_object_agg(a.attribute_key, a.value), '{}'::jsonb)
         FROM listing_attributes AS a WHERE a.listing_id = l.id) AS attributes,
        (SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', m.id, 'fileId', m.file_id, 'mediaType', m.media_type,
           'caption', m.caption, 'sortOrder', m.sort_order,
           'moderationState', m.moderation_state, 'createdAt', m.created_at
         ) ORDER BY m.sort_order, m.created_at, m.id), '[]'::jsonb)
         FROM listing_media AS m WHERE m.listing_id = l.id) AS media
 FROM listings AS l
 JOIN vendors AS v ON v.id = l.vendor_id`;

/** Where each action may start, and where it ends (F-VND-06). */
const TRANSITIONS: Record<
  ListingAction,
  { from: ContentState[]; to: ContentState }
> = {
  submit: { from: ["draft", "changes_requested"], to: "pending_review" },
  pause: { from: ["approved"], to: "paused" },
  resume: { from: ["paused"], to: "approved" },
  unpublish: {
    from: [
      "draft",
      "pending_review",
      "changes_requested",
      "approved",
      "paused",
    ],
    to: "unpublished",
  },
};

/** States in which the owner may still edit. */
const EDITABLE: ContentState[] = [
  "draft",
  "changes_requested",
  "approved",
  "paused",
];

/**
 * F-VND-06 listings: create, edit, submit for review, pause and unpublish.
 * Owner only. A new listing is a draft and is never public: visibility is the
 * live publication gates (F-VND-05), and approval belongs to the admin review
 * queue (F-VND-07). Not enforced yet: the plan's listing limit (no
 * subscriptions module) and the category attribute schema.
 */
@Injectable()
export class ListingsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async create(
    user: AuthenticatedUser,
    vendorId: string,
    request: CreateListingDto,
  ): Promise<ListingView> {
    try {
      const id = await this.database.transaction(async (client) => {
        await this.lockOwnedVendor(client, vendorId, user.userId);
        const category = await client.query<{ current_version: number }>(
          `SELECT current_version FROM categories
           WHERE id = $1 AND lifecycle = 'ACTIVE'`,
          [request.categoryId],
        );
        const version = category.rows[0]?.current_version;
        if (version === undefined) {
          throw new BadRequestException("categoryId is not an active category");
        }
        if (request.subcategoryId) {
          const sub = await client.query(
            `SELECT 1 FROM subcategories WHERE id = $1 AND category_id = $2`,
            [request.subcategoryId, request.categoryId],
          );
          if (sub.rowCount !== 1) {
            throw new BadRequestException(
              "subcategoryId does not belong to the category",
            );
          }
        }
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO listings
             (vendor_id, category_id, subcategory_id, config_version_number,
              listing_type, title, description, price_on_request,
              price_min_minor, price_max_minor, price_currency, price_unit,
              time_zone)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           RETURNING id`,
          [
            vendorId,
            request.categoryId,
            request.subcategoryId ?? null,
            version,
            request.listingType,
            request.title,
            request.description ?? null,
            request.priceOnRequest ?? false,
            request.priceMinMinor ?? null,
            request.priceMaxMinor ?? null,
            request.priceCurrency ?? null,
            request.priceUnit ?? null,
            request.timeZone ?? null,
          ],
        );
        const listingId = inserted.rows[0].id;
        if (request.attributes) {
          await this.replaceAttributes(client, listingId, request.attributes);
        }
        await this.audit.record(
          {
            actorUserId: user.userId,
            action: "listing.create",
            targetType: "listing",
            targetId: listingId,
            metadata: { vendorId, categoryId: request.categoryId },
          },
          client,
        );
        return listingId;
      });
      return await this.get(user, id);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async listForVendor(
    user: AuthenticatedUser,
    vendorId: string,
  ): Promise<ListingView[]> {
    const owned = await this.database.query(
      `SELECT 1 FROM vendors WHERE id = $1 AND owner_user_id = $2`,
      [vendorId, user.userId],
    );
    if (owned.rowCount !== 1) {
      throw new NotFoundException("No such vendor for this user");
    }
    const result = await this.database.query<ListingRow>(
      `${LISTING_SELECT}
       WHERE l.vendor_id = $1 AND v.owner_user_id = $2
       ORDER BY l.created_at DESC, l.id`,
      [vendorId, user.userId],
    );
    return result.rows.map(toView);
  }

  async get(user: AuthenticatedUser, listingId: string): Promise<ListingView> {
    const result = await this.database.query<ListingRow>(
      `${LISTING_SELECT}
       WHERE l.id = $1 AND v.owner_user_id = $2`,
      [listingId, user.userId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("No such listing for this user");
    }
    return toView(row);
  }

  async update(
    user: AuthenticatedUser,
    listingId: string,
    request: UpdateListingDto,
  ): Promise<ListingView> {
    try {
      await this.database.transaction(async (client) => {
        const state = await this.lockOwnedListing(
          client,
          listingId,
          user.userId,
        );
        if (!EDITABLE.includes(state)) {
          throw new ConflictException(`A ${state} listing cannot be edited`);
        }
        // An approved listing that changes goes back to review, so edited
        // content is never public unreviewed. The set of fields that counts as
        // a "material" edit is undecided, so every edit is treated as one.
        const nextState: ContentState =
          state === "approved" ? "pending_review" : state;
        await client.query(
          `UPDATE listings
           SET title = COALESCE($2, title),
               description = COALESCE($3, description),
               price_on_request = COALESCE($4, price_on_request),
               price_min_minor = CASE WHEN $4 IS TRUE THEN NULL
                                 ELSE COALESCE($5, price_min_minor) END,
               price_max_minor = CASE WHEN $4 IS TRUE THEN NULL
                                 ELSE COALESCE($6, price_max_minor) END,
               price_currency = COALESCE($7, price_currency),
               price_unit = COALESCE($8, price_unit),
               time_zone = COALESCE($9, time_zone),
               content_state = $10
           WHERE id = $1`,
          [
            listingId,
            request.title ?? null,
            request.description ?? null,
            request.priceOnRequest ?? null,
            request.priceMinMinor ?? null,
            request.priceMaxMinor ?? null,
            request.priceCurrency ?? null,
            request.priceUnit ?? null,
            request.timeZone ?? null,
            nextState,
          ],
        );
        if (request.attributes) {
          await this.replaceAttributes(client, listingId, request.attributes);
        }
        await this.audit.record(
          {
            actorUserId: user.userId,
            action: "listing.update",
            targetType: "listing",
            targetId: listingId,
            metadata: {
              fields: Object.keys(request).filter(
                (key) => request[key as keyof UpdateListingDto] !== undefined,
              ),
              ...(nextState !== state ? { returnedToReview: true } : {}),
            },
          },
          client,
        );
      });
      return await this.get(user, listingId);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async transition(
    user: AuthenticatedUser,
    listingId: string,
    action: ListingAction,
  ): Promise<ListingView> {
    const rule = TRANSITIONS[action];
    await this.database.transaction(async (client) => {
      const state = await this.lockOwnedListing(client, listingId, user.userId);
      if (!rule.from.includes(state)) {
        throw new ConflictException(`Cannot ${action} a ${state} listing`);
      }
      if (action === "resume") {
        const pendingMedia = await client.query<{ count: number }>(
          `SELECT count(*)::int AS count
           FROM listing_media
           WHERE listing_id = $1 AND moderation_state = 'pending'`,
          [listingId],
        );
        if (pendingMedia.rows[0]?.count > 0) {
          throw new ConflictException(
            "Review all new listing media before resuming the listing",
          );
        }
      }
      if (action === "submit") {
        await this.flagPossibleDuplicates(client, listingId);
      }
      await client.query(
        `UPDATE listings SET content_state = $2 WHERE id = $1`,
        [listingId, rule.to],
      );
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: `listing.${action}`,
          targetType: "listing",
          targetId: listingId,
          metadata: { from: state, to: rule.to },
        },
        client,
      );
    });
    return this.get(user, listingId);
  }

  async addMedia(
    user: AuthenticatedUser,
    listingId: string,
    request: CreateListingMediaDto,
  ) {
    const mediaId = randomUUID();
    return this.database.transaction(async (client) => {
      const current = await client.query<{ content_state: ContentState }>(
        `SELECT listing.content_state
         FROM listings AS listing
         JOIN vendors AS vendor ON vendor.id = listing.vendor_id
         WHERE listing.id = $1 AND vendor.owner_user_id = $2
         FOR UPDATE OF listing`,
        [listingId, user.userId],
      );
      const state = current.rows[0]?.content_state;
      if (!state) {
        throw new NotFoundException("No such listing for this user");
      }
      if (!EDITABLE.includes(state)) {
        throw new ConflictException(`A ${state} listing cannot be edited`);
      }
      const requiredPurpose =
        request.mediaType === "photo" ? "listing-photo" : "listing-portfolio";
      const file = await client.query(
        `SELECT 1 FROM files
         WHERE id = $1 AND owner_user_id = $2
           AND uploaded_at IS NOT NULL AND scan_status = 'clean'
           AND purpose = $3`,
        [request.fileId, user.userId, requiredPurpose],
      );
      if (file.rowCount !== 1) {
        throw new BadRequestException(
          `Media must be an uploaded, clean file with purpose ${requiredPurpose}`,
        );
      }
      const inserted = await client.query<{
        id: string;
        created_at: Date;
      }>(
        `INSERT INTO listing_media
           (id, listing_id, file_id, media_type, caption, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, created_at`,
        [
          mediaId,
          listingId,
          request.fileId,
          request.mediaType,
          request.caption ?? null,
          request.sortOrder ?? 0,
        ],
      );
      const nextState = state === "approved" ? "pending_review" : state;
      if (nextState !== state) {
        await client.query(
          `UPDATE listings SET content_state = $2 WHERE id = $1`,
          [listingId, nextState],
        );
      }
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "listing.media.add",
          targetType: "listing_media",
          targetId: mediaId,
          metadata: {
            listingId,
            fileId: request.fileId,
            mediaType: request.mediaType,
            returnedToReview: nextState !== state,
          },
        },
        client,
      );
      return {
        id: mediaId,
        listingId,
        fileId: request.fileId,
        mediaType: request.mediaType,
        caption: request.caption ?? null,
        sortOrder: request.sortOrder ?? 0,
        moderationState: "pending" as const,
        createdAt: inserted.rows[0].created_at.toISOString(),
      };
    });
  }

  async removeMedia(
    user: AuthenticatedUser,
    listingId: string,
    mediaId: string,
  ): Promise<void> {
    await this.database.transaction(async (client) => {
      const state = await this.lockOwnedListing(client, listingId, user.userId);
      if (!EDITABLE.includes(state)) {
        throw new ConflictException(`A ${state} listing cannot be edited`);
      }
      const deleted = await client.query(
        `DELETE FROM listing_media
         WHERE id = $1 AND listing_id = $2`,
        [mediaId, listingId],
      );
      if (deleted.rowCount !== 1) {
        throw new NotFoundException("No such media for this listing");
      }
      const nextState = state === "approved" ? "pending_review" : state;
      if (nextState !== state) {
        await client.query(
          `UPDATE listings SET content_state = $2 WHERE id = $1`,
          [listingId, nextState],
        );
      }
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "listing.media.remove",
          targetType: "listing_media",
          targetId: mediaId,
          metadata: { listingId, returnedToReview: nextState !== state },
        },
        client,
      );
    });
  }

  private async lockOwnedVendor(
    client: PoolClient,
    vendorId: string,
    userId: string,
  ): Promise<void> {
    const owned = await client.query(
      `SELECT 1 FROM vendors WHERE id = $1 AND owner_user_id = $2 FOR UPDATE`,
      [vendorId, userId],
    );
    if (owned.rowCount !== 1) {
      throw new NotFoundException("No such vendor for this user");
    }
  }

  private async lockOwnedListing(
    client: PoolClient,
    listingId: string,
    userId: string,
  ): Promise<ContentState> {
    const result = await client.query<{ content_state: ContentState }>(
      `SELECT l.content_state
       FROM listings AS l
       JOIN vendors AS v ON v.id = l.vendor_id
       WHERE l.id = $1 AND v.owner_user_id = $2
       FOR UPDATE OF l, v`,
      [listingId, userId],
    );
    const state = result.rows[0]?.content_state;
    if (!state) {
      throw new NotFoundException("No such listing for this user");
    }
    return state;
  }

  private async replaceAttributes(
    client: PoolClient,
    listingId: string,
    attributes: Record<string, unknown>,
  ): Promise<void> {
    const keys = Object.keys(attributes);
    await client.query(
      `DELETE FROM listing_attributes
       WHERE listing_id = $1 AND attribute_key <> ALL($2::text[])`,
      [listingId, keys],
    );
    for (const key of keys) {
      await client.query(
        `INSERT INTO listing_attributes (listing_id, attribute_key, value)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (listing_id, attribute_key)
         DO UPDATE SET value = EXCLUDED.value`,
        [listingId, key, JSON.stringify(attributes[key])],
      );
    }
  }

  private async flagPossibleDuplicates(
    client: PoolClient,
    listingId: string,
  ): Promise<void> {
    const candidates = await client.query<{ id: string }>(
      `SELECT DISTINCT candidate.id
         FROM listings AS listing
         JOIN vendors AS vendor ON vendor.id = listing.vendor_id
         JOIN listings AS candidate
           ON candidate.id <> listing.id
          AND candidate.category_id = listing.category_id
          AND candidate.listing_type = listing.listing_type
          AND lower(regexp_replace(
                regexp_replace(btrim(candidate.title),
                  '[^[:alnum:]]+', ' ', 'g'),
                '[[:space:]]+', ' ', 'g'))
              = lower(regexp_replace(
                regexp_replace(btrim(listing.title),
                  '[^[:alnum:]]+', ' ', 'g'),
                '[[:space:]]+', ' ', 'g'))
         JOIN vendors AS candidate_vendor
           ON candidate_vendor.id = candidate.vendor_id
          AND candidate_vendor.id = vendor.id
         WHERE listing.id = $1
           AND candidate.content_state IN
               ('pending_review', 'approved', 'changes_requested', 'paused')
           AND EXISTS (
             SELECT 1
             FROM service_areas AS current_area
             JOIN service_areas AS candidate_area
               ON candidate_area.coverage_type = current_area.coverage_type
              AND candidate_area.country_id IS NOT DISTINCT FROM current_area.country_id
              AND candidate_area.region_id IS NOT DISTINCT FROM current_area.region_id
              AND candidate_area.city_id IS NOT DISTINCT FROM current_area.city_id
              AND candidate_area.postal_code IS NOT DISTINCT FROM current_area.postal_code
              AND candidate_area.radius_km IS NOT DISTINCT FROM current_area.radius_km
              AND candidate_area.center_latitude IS NOT DISTINCT FROM current_area.center_latitude
              AND candidate_area.center_longitude IS NOT DISTINCT FROM current_area.center_longitude
             WHERE (current_area.listing_id = listing.id
                    OR (current_area.listing_id IS NULL
                        AND current_area.vendor_id = listing.vendor_id))
               AND (candidate_area.listing_id = candidate.id
                    OR (candidate_area.listing_id IS NULL
                        AND candidate_area.vendor_id = candidate.vendor_id))
           )`,
      [listingId],
    );
    for (const candidate of candidates.rows) {
      const existing = await client.query(
        `SELECT 1 FROM duplicate_flags
           WHERE (listing_id = $1 AND possible_duplicate_listing_id = $2)
              OR (listing_id = $2 AND possible_duplicate_listing_id = $1)`,
        [listingId, candidate.id],
      );
      if ((existing.rowCount ?? 0) > 0) continue;
      await client.query(
        `INSERT INTO duplicate_flags
             (id, listing_id, possible_duplicate_listing_id, similarity_details)
           VALUES ($1, LEAST($2::uuid, $3::uuid),
                      GREATEST($2::uuid, $3::uuid), $4::jsonb)`,
        [
          randomUUID(),
          listingId,
          candidate.id,
          JSON.stringify({
            signals: [
              "same_vendor",
              "same_category_and_listing_type",
              "same_normalized_title",
              "same_declared_service_area",
            ],
          }),
        ],
      );
    }
  }

  private translate(error: unknown): unknown {
    const code = (error as { code?: string }).code;
    if (code === FOREIGN_KEY_VIOLATION) {
      return new BadRequestException("Unknown category or subcategory");
    }
    if (code === CHECK_VIOLATION) {
      return new BadRequestException(
        "Price fields are inconsistent: a range needs a currency, the maximum cannot be below the minimum, and price on request has no range",
      );
    }
    return error;
  }
}

function toView(row: ListingRow): ListingView {
  const minor = (value: string | null) =>
    value === null ? null : Number(value);
  return {
    id: row.id,
    vendorId: row.vendor_id,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    configVersion: row.config_version_number,
    listingType: row.listing_type,
    title: row.title,
    description: row.description,
    contentState: row.content_state,
    priceOnRequest: row.price_on_request,
    priceMinMinor: minor(row.price_min_minor),
    priceMaxMinor: minor(row.price_max_minor),
    priceCurrency: row.price_currency,
    priceUnit: row.price_unit,
    timeZone: row.time_zone,
    attributes: row.attributes ?? {},
    media: (row.media ?? []).map((media) => ({
      ...media,
      createdAt:
        media.createdAt instanceof Date
          ? media.createdAt.toISOString()
          : media.createdAt,
    })),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
