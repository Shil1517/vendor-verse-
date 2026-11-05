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
  createdAt: string;
  updatedAt: string;
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
         FROM listing_attributes AS a WHERE a.listing_id = l.id) AS attributes
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
 * queue (F-VND-07), which is not built. Not enforced yet: the plan's listing
 * limit (no subscriptions module), the category attribute schema, and photos.
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
       FOR UPDATE OF l`,
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
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
