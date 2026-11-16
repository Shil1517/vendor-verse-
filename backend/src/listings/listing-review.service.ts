import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import {
  DuplicateReviewStatus,
  ListingMediaReviewStatus,
  ListingReviewStatus,
  ProfileImageReviewStatus,
  ProfileImageType,
} from "./dto/listing-review.dto";

interface QueueCursor {
  createdAt: string;
  id: string;
  discriminator?: string;
}

interface ListingQueueRow {
  id: string;
  vendor_id: string;
  vendor_name: string | null;
  category_id: string;
  category_name: string;
  subcategory_id: string | null;
  listing_type: "service" | "product";
  title: string;
  description: string | null;
  content_state: string;
  price_on_request: boolean;
  price_min_minor: string | null;
  price_max_minor: string | null;
  price_currency: string | null;
  price_unit: string | null;
  attributes: Record<string, unknown>;
  updated_at: Date;
  media: ListingMediaRow[];
  duplicate_flags: Array<{
    id: string;
    otherListingId: string;
    reviewStatus: string;
  }>;
}

interface ListingMediaRow {
  id: string;
  fileId: string;
  mediaType: "photo" | "portfolio";
  caption: string | null;
  sortOrder: number;
  moderationState: "pending" | "approved" | "rejected";
  createdAt: string | Date;
}

interface DuplicateQueueRow {
  id: string;
  listing_id: string;
  possible_duplicate_listing_id: string;
  similarity_details: Record<string, unknown>;
  review_status: "pending" | "confirmed_duplicate" | "not_duplicate";
  created_at: Date;
  listing_title: string;
  listing_vendor_name: string | null;
  listing_category_id: string;
  listing_category_name: string;
  candidate_title: string;
  candidate_vendor_name: string | null;
  candidate_category_id: string;
  candidate_category_name: string;
}

interface ProfileImageQueueRow {
  vendor_id: string;
  vendor_name: string | null;
  owner_user_id: string;
  image_type: ProfileImageType;
  file_id: string;
  created_at: Date;
}

const LISTING_REVIEW_SELECT = `SELECT listing.id, listing.vendor_id,
       COALESCE(profile.trading_name, vendor.legal_name) AS vendor_name,
       listing.category_id, category_version.name AS category_name,
       listing.subcategory_id, listing.listing_type, listing.title,
       listing.description, listing.content_state, listing.price_on_request,
       listing.price_min_minor, listing.price_max_minor,
       listing.price_currency, listing.price_unit, listing.updated_at,
       COALESCE((
         SELECT jsonb_object_agg(attribute.attribute_key, attribute.value)
         FROM listing_attributes AS attribute
         WHERE attribute.listing_id = listing.id
       ), '{}'::jsonb) AS attributes,
       COALESCE((
         SELECT jsonb_agg(jsonb_build_object(
           'id', media.id, 'fileId', media.file_id,
           'mediaType', media.media_type, 'caption', media.caption,
           'sortOrder', media.sort_order,
           'moderationState', media.moderation_state,
           'createdAt', media.created_at
         ) ORDER BY media.sort_order, media.created_at, media.id)
         FROM listing_media AS media
         WHERE media.listing_id = listing.id
       ), '[]'::jsonb) AS media,
       COALESCE((
         SELECT jsonb_agg(jsonb_build_object(
           'id', flag.id,
           'otherListingId', CASE
             WHEN flag.listing_id = listing.id
             THEN flag.possible_duplicate_listing_id
             ELSE flag.listing_id
           END,
           'reviewStatus', flag.review_status
         ) ORDER BY flag.created_at, flag.id)
         FROM duplicate_flags AS flag
         WHERE flag.review_status = 'pending'
           AND (flag.listing_id = listing.id
                OR flag.possible_duplicate_listing_id = listing.id)
       ), '[]'::jsonb) AS duplicate_flags
 FROM listings AS listing
 JOIN vendors AS vendor ON vendor.id = listing.vendor_id
 JOIN category_config_versions AS category_version
   ON category_version.category_id = listing.category_id
  AND category_version.version_number = listing.config_version_number
 LEFT JOIN vendor_profiles AS profile ON profile.vendor_id = vendor.id`;

@Injectable()
export class ListingReviewService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async listReviewQueue(options: { limit: number; cursor?: string }) {
    const cursor = decodeCursor(options.cursor, "listing review");
    const result = await this.database.query<ListingQueueRow>(
      `${LISTING_REVIEW_SELECT}
       WHERE listing.content_state = 'pending_review'
         AND ($1::timestamptz IS NULL
              OR (listing.updated_at, listing.id) > ($1, $2::uuid))
       ORDER BY listing.updated_at, listing.id
       LIMIT $3`,
      [cursor?.createdAt ?? null, cursor?.id ?? null, options.limit + 1],
    );
    const hasMore = result.rows.length > options.limit;
    const rows = hasMore ? result.rows.slice(0, options.limit) : result.rows;
    return {
      listings: rows.map(toListingQueueView),
      nextCursor:
        hasMore && rows.length > 0
          ? encodeCursor(
              rows[rows.length - 1].updated_at,
              rows[rows.length - 1].id,
            )
          : null,
    };
  }

  async review(
    actor: AuthenticatedUser,
    listingId: string,
    status: ListingReviewStatus,
    reason: string,
  ) {
    const reviewId = randomUUID();
    return this.database.transaction(async (client) => {
      const current = await client.query<{
        vendor_id: string;
        owner_user_id: string;
        content_state: string;
      }>(
        `SELECT listing.vendor_id, vendor.owner_user_id, listing.content_state
         FROM listings AS listing
         JOIN vendors AS vendor ON vendor.id = listing.vendor_id
         WHERE listing.id = $1
         FOR UPDATE OF listing`,
        [listingId],
      );
      const listing = current.rows[0];
      if (!listing) throw new NotFoundException("No such listing");
      if (listing.owner_user_id === actor.userId) {
        throw new ForbiddenException(
          "A vendor owner cannot review their own listing",
        );
      }
      if (listing.content_state !== "pending_review") {
        throw new ConflictException(
          "Only listings pending review can receive a content decision",
        );
      }
      if (status === "approved") {
        const pendingMedia = await client.query<{ count: number }>(
          `SELECT count(*)::int AS count
           FROM listing_media
           WHERE listing_id = $1 AND moderation_state = 'pending'`,
          [listingId],
        );
        if (pendingMedia.rows[0]?.count > 0) {
          throw new ConflictException(
            "Review all listing photos and portfolio media before approving the listing",
          );
        }
        const pendingDuplicates = await client.query<{ count: number }>(
          `SELECT count(*)::int AS count
           FROM duplicate_flags
           WHERE review_status = 'pending'
             AND (listing_id = $1 OR possible_duplicate_listing_id = $1)`,
          [listingId],
        );
        if (pendingDuplicates.rows[0]?.count > 0) {
          throw new ConflictException(
            "Resolve pending duplicate flags before approving the listing",
          );
        }
      }
      await client.query(
        `UPDATE listings SET content_state = $2 WHERE id = $1`,
        [listingId, status],
      );
      await client.query(
        `INSERT INTO listing_reviews
           (id, listing_id, reviewer_user_id, status, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [reviewId, listingId, actor.userId, status, reason],
      );
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: `listing.review.${status}`,
          targetType: "listing",
          targetId: listingId,
          reason,
          metadata: { vendorId: listing.vendor_id, reviewId },
        },
        client,
      );
      return {
        id: reviewId,
        listingId,
        status,
        reason,
        reviewerUserId: actor.userId,
      };
    });
  }

  async reviewMedia(
    actor: AuthenticatedUser,
    listingId: string,
    mediaId: string,
    status: ListingMediaReviewStatus,
    reason: string,
  ) {
    return this.database.transaction(async (client) => {
      const current = await client.query<{
        file_id: string;
        vendor_id: string;
        owner_user_id: string;
        moderation_state: string;
      }>(
        `SELECT media.file_id, listing.vendor_id, vendor.owner_user_id,
                media.moderation_state
         FROM listing_media AS media
         JOIN files AS file ON file.id = media.file_id
         JOIN listings AS listing ON listing.id = media.listing_id
         JOIN vendors AS vendor ON vendor.id = listing.vendor_id
         WHERE media.id = $1 AND listing.id = $2
           AND file.uploaded_at IS NOT NULL AND file.scan_status = 'clean'
         FOR UPDATE OF media`,
        [mediaId, listingId],
      );
      const media = current.rows[0];
      if (!media) throw new NotFoundException("No such listing media");
      if (media.owner_user_id === actor.userId) {
        throw new ForbiddenException(
          "A vendor owner cannot review their own listing media",
        );
      }
      if (media.moderation_state !== "pending") {
        throw new ConflictException("This listing media was already reviewed");
      }
      await client.query(
        `UPDATE listing_media SET moderation_state = $2 WHERE id = $1`,
        [mediaId, status],
      );
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: `listing.media.${status}`,
          targetType: "listing_media",
          targetId: mediaId,
          reason,
          metadata: { listingId, fileId: media.file_id },
        },
        client,
      );
      return { id: mediaId, listingId, fileId: media.file_id, status, reason };
    });
  }

  async listDuplicateQueue(options: { limit: number; cursor?: string }) {
    const cursor = decodeCursor(options.cursor, "duplicate queue");
    const result = await this.database.query<DuplicateQueueRow>(
      `SELECT flag.id, flag.listing_id, flag.possible_duplicate_listing_id,
              flag.similarity_details, flag.review_status, flag.created_at,
              listing.title AS listing_title,
              COALESCE(listing_profile.trading_name, listing_vendor.legal_name)
                AS listing_vendor_name,
              listing.category_id AS listing_category_id,
              listing_category.name AS listing_category_name,
              candidate.title AS candidate_title,
              COALESCE(candidate_profile.trading_name, candidate_vendor.legal_name)
                AS candidate_vendor_name,
              candidate.category_id AS candidate_category_id,
              candidate_category.name AS candidate_category_name
       FROM duplicate_flags AS flag
       JOIN listings AS listing ON listing.id = flag.listing_id
       JOIN vendors AS listing_vendor ON listing_vendor.id = listing.vendor_id
       LEFT JOIN vendor_profiles AS listing_profile
         ON listing_profile.vendor_id = listing_vendor.id
       JOIN category_config_versions AS listing_category
         ON listing_category.category_id = listing.category_id
        AND listing_category.version_number = listing.config_version_number
       JOIN listings AS candidate
         ON candidate.id = flag.possible_duplicate_listing_id
       JOIN vendors AS candidate_vendor ON candidate_vendor.id = candidate.vendor_id
       LEFT JOIN vendor_profiles AS candidate_profile
         ON candidate_profile.vendor_id = candidate_vendor.id
       JOIN category_config_versions AS candidate_category
         ON candidate_category.category_id = candidate.category_id
        AND candidate_category.version_number = candidate.config_version_number
       WHERE flag.review_status = 'pending'
         AND ($1::timestamptz IS NULL
              OR (flag.created_at, flag.id) > ($1, $2::uuid))
       ORDER BY flag.created_at, flag.id
       LIMIT $3`,
      [cursor?.createdAt ?? null, cursor?.id ?? null, options.limit + 1],
    );
    const hasMore = result.rows.length > options.limit;
    const rows = hasMore ? result.rows.slice(0, options.limit) : result.rows;
    return {
      duplicates: rows.map(toDuplicateQueueView),
      nextCursor:
        hasMore && rows.length > 0
          ? encodeCursor(
              rows[rows.length - 1].created_at,
              rows[rows.length - 1].id,
            )
          : null,
    };
  }

  async reviewDuplicate(
    actor: AuthenticatedUser,
    flagId: string,
    status: DuplicateReviewStatus,
    reason: string,
  ) {
    return this.database.transaction(async (client) => {
      const current = await client.query<{
        listing_id: string;
        possible_duplicate_listing_id: string;
        review_status: string;
        owner_user_ids: string[];
      }>(
        `SELECT flag.listing_id, flag.possible_duplicate_listing_id,
                flag.review_status,
                ARRAY[listing_vendor.owner_user_id, candidate_vendor.owner_user_id]
                  AS owner_user_ids
         FROM duplicate_flags AS flag
         JOIN listings AS listing ON listing.id = flag.listing_id
         JOIN vendors AS listing_vendor ON listing_vendor.id = listing.vendor_id
         JOIN listings AS candidate
           ON candidate.id = flag.possible_duplicate_listing_id
         JOIN vendors AS candidate_vendor ON candidate_vendor.id = candidate.vendor_id
         WHERE flag.id = $1
         FOR UPDATE OF flag`,
        [flagId],
      );
      const flag = current.rows[0];
      if (!flag) throw new NotFoundException("No such duplicate flag");
      if (flag.owner_user_ids.includes(actor.userId)) {
        throw new ForbiddenException(
          "A vendor owner cannot review a duplicate flag involving their listings",
        );
      }
      if (flag.review_status !== "pending") {
        throw new ConflictException("This duplicate flag was already reviewed");
      }
      await client.query(
        `UPDATE duplicate_flags
         SET review_status = $2, reviewed_by_user_id = $3,
             reviewed_at = CURRENT_TIMESTAMP, review_reason = $4
         WHERE id = $1`,
        [flagId, status, actor.userId, reason],
      );
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: `listing.duplicate.${status}`,
          targetType: "duplicate_flag",
          targetId: flagId,
          reason,
          metadata: {
            listingId: flag.listing_id,
            possibleDuplicateListingId: flag.possible_duplicate_listing_id,
          },
        },
        client,
      );
      return {
        id: flagId,
        listingId: flag.listing_id,
        possibleDuplicateListingId: flag.possible_duplicate_listing_id,
        status,
        reason,
      };
    });
  }

  async listProfileImageQueue(options: { limit: number; cursor?: string }) {
    const cursor = decodeCursor(options.cursor, "profile image queue", true);
    const result = await this.database.query<ProfileImageQueueRow>(
      `WITH profile_images AS (
         SELECT vendor.id AS vendor_id,
                COALESCE(profile.trading_name, vendor.legal_name) AS vendor_name,
                vendor.owner_user_id, 'logo'::text AS image_type,
                profile.logo_file_id AS file_id, file.created_at
         FROM vendor_profiles AS profile
         JOIN vendors AS vendor ON vendor.id = profile.vendor_id
         JOIN files AS file ON file.id = profile.logo_file_id
         WHERE profile.logo_file_id IS NOT NULL
           AND file.uploaded_at IS NOT NULL AND file.scan_status = 'clean'
           AND NOT EXISTS (
             SELECT 1 FROM vendor_profile_image_reviews AS review
             WHERE review.vendor_id = vendor.id
               AND review.image_type = 'logo'
               AND review.file_id = profile.logo_file_id
           )
         UNION ALL
         SELECT vendor.id, COALESCE(profile.trading_name, vendor.legal_name),
                vendor.owner_user_id, 'banner'::text,
                profile.banner_file_id, file.created_at
         FROM vendor_profiles AS profile
         JOIN vendors AS vendor ON vendor.id = profile.vendor_id
         JOIN files AS file ON file.id = profile.banner_file_id
         WHERE profile.banner_file_id IS NOT NULL
           AND file.uploaded_at IS NOT NULL AND file.scan_status = 'clean'
           AND NOT EXISTS (
             SELECT 1 FROM vendor_profile_image_reviews AS review
             WHERE review.vendor_id = vendor.id
               AND review.image_type = 'banner'
               AND review.file_id = profile.banner_file_id
           )
       )
       SELECT vendor_id, vendor_name, owner_user_id, image_type, file_id, created_at
       FROM profile_images
       WHERE ($1::timestamptz IS NULL
              OR (created_at, file_id, image_type) > ($1, $2::uuid, $3::text))
       ORDER BY created_at, file_id, image_type
       LIMIT $4`,
      [
        cursor?.createdAt ?? null,
        cursor?.id ?? null,
        cursor?.discriminator ?? null,
        options.limit + 1,
      ],
    );
    const hasMore = result.rows.length > options.limit;
    const rows = hasMore ? result.rows.slice(0, options.limit) : result.rows;
    return {
      images: rows.map(toProfileImageQueueView),
      nextCursor:
        hasMore && rows.length > 0
          ? encodeCursor(
              rows[rows.length - 1].created_at,
              rows[rows.length - 1].file_id,
              rows[rows.length - 1].image_type,
            )
          : null,
    };
  }

  async reviewProfileImage(
    actor: AuthenticatedUser,
    vendorId: string,
    imageType: ProfileImageType,
    fileId: string,
    status: ProfileImageReviewStatus,
    reason: string,
  ) {
    const reviewId = randomUUID();
    return this.database.transaction(async (client) => {
      const current = await client.query<{ owner_user_id: string }>(
        `SELECT vendor.owner_user_id
         FROM vendor_profiles AS profile
         JOIN vendors AS vendor ON vendor.id = profile.vendor_id
         JOIN files AS file ON file.id = $3
           AND file.uploaded_at IS NOT NULL AND file.scan_status = 'clean'
         WHERE profile.vendor_id = $1
           AND CASE WHEN $2 = 'logo' THEN profile.logo_file_id
                    ELSE profile.banner_file_id END = $3
         FOR UPDATE OF profile`,
        [vendorId, imageType, fileId],
      );
      const profile = current.rows[0];
      if (!profile) {
        throw new NotFoundException("No such current vendor profile image");
      }
      if (profile.owner_user_id === actor.userId) {
        throw new ForbiddenException(
          "A vendor owner cannot review their own profile image",
        );
      }
      const prior = await client.query(
        `SELECT 1 FROM vendor_profile_image_reviews
         WHERE vendor_id = $1 AND image_type = $2 AND file_id = $3`,
        [vendorId, imageType, fileId],
      );
      if ((prior.rowCount ?? 0) > 0) {
        throw new ConflictException("This profile image was already reviewed");
      }
      await client.query(
        `INSERT INTO vendor_profile_image_reviews
           (id, vendor_id, image_type, file_id, reviewer_user_id, status, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [reviewId, vendorId, imageType, fileId, actor.userId, status, reason],
      );
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: `vendor.profile_image.${status}`,
          targetType: "file",
          targetId: fileId,
          reason,
          metadata: { vendorId, imageType, reviewId },
        },
        client,
      );
      return { id: reviewId, vendorId, imageType, fileId, status, reason };
    });
  }
}

function toListingQueueView(row: ListingQueueRow) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    subcategoryId: row.subcategory_id,
    listingType: row.listing_type,
    title: row.title,
    description: row.description,
    contentState: row.content_state,
    priceOnRequest: row.price_on_request,
    priceMinMinor:
      row.price_min_minor === null ? null : Number(row.price_min_minor),
    priceMaxMinor:
      row.price_max_minor === null ? null : Number(row.price_max_minor),
    priceCurrency: row.price_currency,
    priceUnit: row.price_unit,
    attributes: row.attributes ?? {},
    media: row.media.map((media) => ({
      id: media.id,
      fileId: media.fileId,
      mediaType: media.mediaType,
      caption: media.caption,
      sortOrder: media.sortOrder,
      moderationState: media.moderationState,
      createdAt:
        media.createdAt instanceof Date
          ? media.createdAt.toISOString()
          : media.createdAt,
    })),
    duplicateFlags: row.duplicate_flags.map((flag) => ({
      id: flag.id,
      otherListingId: flag.otherListingId,
      reviewStatus: flag.reviewStatus,
    })),
    submittedAt: row.updated_at.toISOString(),
  };
}

function toDuplicateQueueView(row: DuplicateQueueRow) {
  return {
    id: row.id,
    listing: {
      id: row.listing_id,
      title: row.listing_title,
      vendorName: row.listing_vendor_name,
      categoryId: row.listing_category_id,
      categoryName: row.listing_category_name,
    },
    possibleDuplicate: {
      id: row.possible_duplicate_listing_id,
      title: row.candidate_title,
      vendorName: row.candidate_vendor_name,
      categoryId: row.candidate_category_id,
      categoryName: row.candidate_category_name,
    },
    signals: row.similarity_details,
    status: row.review_status,
    flaggedAt: row.created_at.toISOString(),
  };
}

function toProfileImageQueueView(row: ProfileImageQueueRow) {
  return {
    vendorId: row.vendor_id,
    vendorName: row.vendor_name,
    imageType: row.image_type,
    fileId: row.file_id,
    submittedAt: row.created_at.toISOString(),
  };
}

function encodeCursor(
  createdAt: Date,
  id: string,
  discriminator?: string,
): string {
  return Buffer.from(
    JSON.stringify([createdAt.toISOString(), id, discriminator]),
  ).toString("base64url");
}

function decodeCursor(
  cursor: string | undefined,
  label: string,
  withDiscriminator = false,
): QueueCursor | undefined {
  if (cursor === undefined) return undefined;
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new BadRequestException(`Invalid ${label} cursor`);
    }
    throw error;
  }
  if (
    !Array.isArray(decoded) ||
    typeof decoded[0] !== "string" ||
    typeof decoded[1] !== "string" ||
    !Number.isFinite(Date.parse(decoded[0])) ||
    !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(decoded[1]) ||
    (withDiscriminator &&
      typeof decoded[2] !== "string" &&
      decoded[2] !== undefined)
  ) {
    throw new BadRequestException(`Invalid ${label} cursor`);
  }
  return {
    createdAt: decoded[0],
    id: decoded[1],
    ...(typeof decoded[2] === "string" ? { discriminator: decoded[2] } : {}),
  };
}
