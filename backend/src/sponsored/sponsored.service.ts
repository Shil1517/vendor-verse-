import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { CreateCampaignDto, SetCampaignStatusDto } from "./dto/sponsored.dto";

interface CampaignRow {
  id: string; vendor_id: string; listing_id: string | null; placement: string; status: string;
  starts_at: Date | null; ends_at: Date | null; configuration: Record<string, unknown>;
  created_at: Date; updated_at: Date;
}
const view = (r: CampaignRow) => ({ id: r.id, vendorId: r.vendor_id, listingId: r.listing_id,
  placement: r.placement, status: r.status, startsAt: r.starts_at, endsAt: r.ends_at,
  configuration: r.configuration, createdAt: r.created_at, updatedAt: r.updated_at });

@Injectable()
export class SponsoredService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  private async requireOwned(user: AuthenticatedUser, vendorId: string) {
    const owned = await this.database.query(`SELECT 1 FROM vendors WHERE id = $1 AND owner_user_id = $2`,
      [vendorId, user.userId]);
    if (!owned.rowCount) throw new NotFoundException("No such vendor for this user");
  }

  async listOwn(user: AuthenticatedUser, vendorId: string) {
    await this.requireOwned(user, vendorId);
    const found = await this.database.query<CampaignRow>(`SELECT * FROM sponsored_campaigns WHERE vendor_id = $1
      ORDER BY created_at DESC, id DESC LIMIT 100`, [vendorId]);
    return { items: found.rows.map(view) };
  }

  async create(user: AuthenticatedUser, vendorId: string, body: CreateCampaignDto) {
    await this.requireOwned(user, vendorId);
    const placement = body.placement.trim();
    if (!placement) throw new BadRequestException("Placement is required");
    if (body.listingId) {
      const listing = await this.database.query(`SELECT 1 FROM listings WHERE id = $1 AND vendor_id = $2`,
        [body.listingId, vendorId]);
      if (!listing.rowCount) throw new NotFoundException("No such listing for this vendor");
    }
    return this.database.transaction(async (client) => {
      const inserted = await client.query<CampaignRow>(`INSERT INTO sponsored_campaigns
        (vendor_id, listing_id, placement, configuration) VALUES ($1, $2, $3, $4::jsonb) RETURNING *`,
        [vendorId, body.listingId ?? null, placement, JSON.stringify(body.configuration ?? {})]);
      await this.audit.record({ actorUserId: user.userId, action: "sponsored.created",
        targetType: "sponsored_campaign", targetId: inserted.rows[0].id }, client);
      return view(inserted.rows[0]);
    });
  }

  async vendorStatus(user: AuthenticatedUser, vendorId: string, campaignId: string, body: SetCampaignStatusDto) {
    await this.requireOwned(user, vendorId);
    if (body.status !== "pending_review" && body.status !== "ended") {
      throw new BadRequestException("Vendor can only submit or end a campaign");
    }
    return this.changeStatus(user, campaignId, vendorId, body, false);
  }

  async adminStatus(user: AuthenticatedUser, campaignId: string, body: SetCampaignStatusDto) {
    if (body.status !== "paused" && body.status !== "ended") {
      throw new BadRequestException("Admin can only pause or end a campaign");
    }
    return this.changeStatus(user, campaignId, null, body, true);
  }

  private async changeStatus(user: AuthenticatedUser, campaignId: string, vendorId: string | null,
    body: SetCampaignStatusDto, admin: boolean) {
    const reason = body.reason.trim();
    if (!reason) throw new BadRequestException("Reason is required");
    return this.database.transaction(async (client) => {
      const found = await client.query<CampaignRow>(`SELECT * FROM sponsored_campaigns
        WHERE id = $1 AND ($2::uuid IS NULL OR vendor_id = $2) FOR UPDATE`, [campaignId, vendorId]);
      const current = found.rows[0];
      if (!current) throw new NotFoundException("No such campaign");
      if (current.status === body.status) throw new ConflictException("Campaign already has this status");
      if (body.status === "pending_review" && current.status !== "draft") {
        throw new ConflictException("Only a draft campaign can be submitted");
      }
      if (body.status === "paused" && current.status !== "active") {
        throw new ConflictException("Only an active campaign can be paused");
      }
      if (body.status === "ended" && current.status === "ended") {
        throw new ConflictException("Campaign already ended");
      }
      const updated = await client.query<CampaignRow>(`UPDATE sponsored_campaigns
        SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`, [campaignId, body.status]);
      await this.audit.record({ actorUserId: user.userId, action: `sponsored.${admin ? "admin" : "vendor"}_status_changed`,
        targetType: "sponsored_campaign", targetId: campaignId, reason,
        metadata: { from: current.status, to: body.status } }, client);
      return view(updated.rows[0]);
    });
  }

  async adminList() {
    const found = await this.database.query<CampaignRow>(`SELECT * FROM sponsored_campaigns
      ORDER BY updated_at DESC, id DESC LIMIT 100`);
    return { items: found.rows.map(view) };
  }
}
