import { Injectable, NotFoundException } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";

export type GateId =
  | "account_state"
  | "content_review"
  | "subscription"
  | "category_verification"
  | "required_fields_and_service_area"
  | "no_holds";

export interface GateView {
  id: GateId;
  /** true = met, false = not met, null = cannot be evaluated yet. */
  met: boolean | null;
  detail: string;
}

export interface PublicationGatesView {
  vendorId: string;
  listingId: string | null;
  gates: GateView[];
  /** True only when every gate is met. A gate that cannot be evaluated blocks publication. */
  canPublish: boolean;
}

interface FactsRow {
  account_status: string;
  approved_count: string;
  service_area_count: string;
}

/**
 * F-VND-05 publication gates, computed from current data on every call and
 * never stored. Six gates: account state, content review, subscription,
 * category verification, required fields and service area, no holds.
 *
 * Three need modules that do not exist yet (subscriptions, the verification
 * review flow, cases/holds). They are reported as `met: null` and, because an
 * unknown is not a pass, they keep canPublish false. Wiring them in is one
 * query each when those modules land.
 */
@Injectable()
export class PublicationGatesService {
  constructor(private readonly database: DatabaseService) {}

  async compute(
    user: AuthenticatedUser,
    vendorId: string,
    listingId?: string,
  ): Promise<PublicationGatesView> {
    const facts = await this.database.query<FactsRow>(
      `SELECT u.account_status,
         (SELECT count(*) FROM listings
          WHERE vendor_id = v.id AND content_state = 'approved'
            AND ($2::uuid IS NULL OR id = $2::uuid)) AS approved_count,
         (SELECT count(*) FROM service_areas
          WHERE vendor_id = v.id
            AND (listing_id IS NULL OR listing_id = $2::uuid)) AS service_area_count
       FROM vendors AS v
       JOIN users AS u ON u.id = v.owner_user_id
       WHERE v.id = $1 AND v.owner_user_id = $3`,
      [vendorId, listingId ?? null, user.userId],
    );
    const row = facts.rows[0];
    if (!row) {
      throw new NotFoundException("No such vendor for this user");
    }

    let missingAttributes: string[] = [];
    if (listingId) {
      const listing = await this.database.query<{
        required: unknown;
        present: string[] | null;
      }>(
        `SELECT cfg.configuration #> '{attributeSchema,required}' AS required,
                (SELECT array_agg(a.attribute_key) FROM listing_attributes a
                 WHERE a.listing_id = l.id) AS present
         FROM listings AS l
         JOIN category_config_versions AS cfg
           ON cfg.category_id = l.category_id
          AND cfg.version_number = l.config_version_number
         WHERE l.id = $1 AND l.vendor_id = $2`,
        [listingId, vendorId],
      );
      const found = listing.rows[0];
      if (!found) {
        throw new NotFoundException("No such listing for this vendor");
      }
      const required = Array.isArray(found.required)
        ? found.required.filter((k): k is string => typeof k === "string")
        : [];
      missingAttributes = required.filter(
        (key) => !(found.present ?? []).includes(key),
      );
    }

    const hasArea = Number(row.service_area_count) > 0;
    const approved = Number(row.approved_count) > 0;
    const fieldsMet = hasArea && missingAttributes.length === 0;
    const gates: GateView[] = [
      {
        id: "account_state",
        met: row.account_status === "active",
        detail: `Account state is ${row.account_status}`,
      },
      {
        id: "content_review",
        met: approved,
        detail: approved
          ? "Content is approved"
          : "No approved listing yet; approval is by the admin review queue",
      },
      {
        id: "subscription",
        met: null,
        detail: "Not evaluated: the subscriptions module is not built",
      },
      {
        id: "category_verification",
        met: null,
        detail: "Not evaluated: the verification review flow is not built",
      },
      {
        id: "required_fields_and_service_area",
        met: fieldsMet,
        detail: !hasArea
          ? "Declare at least one service area"
          : missingAttributes.length > 0
            ? `Missing required attributes: ${missingAttributes.join(", ")}`
            : "Service area declared and required attributes present",
      },
      {
        id: "no_holds",
        met: null,
        detail: "Not evaluated: cases and holds are not built",
      },
    ];
    return {
      vendorId,
      listingId: listingId ?? null,
      gates,
      canPublish: gates.every((gate) => gate.met === true),
    };
  }
}
