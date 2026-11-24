import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { AddLeadActivityDto, CreateLeadDto, UpdateLeadDto } from "./dto/agent.dto";

interface LeadRow {
  id: string; assigned_agent_user_id: string; created_by_user_id: string;
  prospect_name: string; business_name: string | null; contact_details: Record<string, unknown>;
  status: string; converted_vendor_id: string | null; created_at: Date; updated_at: Date;
}
interface ActivityRow {
  id: string; lead_id: string; actor_user_id: string; activity_type: string;
  notes: string | null; follow_up_at: Date | null; created_at: Date;
}
const leadView = (r: LeadRow) => ({ id: r.id, assignedAgentUserId: r.assigned_agent_user_id,
  prospectName: r.prospect_name, businessName: r.business_name, contactDetails: r.contact_details,
  status: r.status, convertedVendorId: r.converted_vendor_id, createdAt: r.created_at, updatedAt: r.updated_at });
const activityView = (r: ActivityRow) => ({ id: r.id, leadId: r.lead_id, activityType: r.activity_type,
  notes: r.notes, followUpAt: r.follow_up_at, createdAt: r.created_at });

@Injectable()
export class AgentsService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  async create(user: AuthenticatedUser, body: CreateLeadDto) {
    const name = body.prospectName.trim();
    if (!name || (body.businessName !== undefined && !body.businessName.trim())) throw new BadRequestException("Prospect and business names cannot be blank");
    return this.database.transaction(async (client) => {
      const active = await client.query(`SELECT 1 FROM sales_agent_profiles WHERE user_id = $1 AND status = 'active'`, [user.userId]);
      if (!active.rowCount) throw new NotFoundException("No active sales-agent profile");
      const inserted = await client.query<LeadRow>(
        `INSERT INTO sales_leads (assigned_agent_user_id, created_by_user_id, prospect_name, business_name, contact_details)
         VALUES ($1, $1, $2, $3, $4::jsonb) RETURNING *`,
        [user.userId, name, body.businessName?.trim() ?? null, JSON.stringify(body.contactDetails ?? {})],
      );
      await this.audit.record({ actorUserId: user.userId, action: "sales_lead.created", targetType: "sales_lead", targetId: inserted.rows[0].id }, client);
      return leadView(inserted.rows[0]);
    });
  }

  async list(user: AuthenticatedUser) {
    const found = await this.database.query<LeadRow>(
      `SELECT l.* FROM sales_leads l JOIN sales_agent_profiles p ON p.user_id = l.assigned_agent_user_id
       WHERE l.assigned_agent_user_id = $1 AND p.status = 'active'
       ORDER BY l.updated_at DESC, l.id DESC LIMIT 100`, [user.userId],
    );
    return { items: found.rows.map(leadView) };
  }

  async get(user: AuthenticatedUser, id: string) {
    const found = await this.database.query<LeadRow>(
      `SELECT l.* FROM sales_leads l JOIN sales_agent_profiles p ON p.user_id = l.assigned_agent_user_id
       WHERE l.id = $1 AND l.assigned_agent_user_id = $2 AND p.status = 'active'`, [id, user.userId],
    );
    if (!found.rows[0]) throw new NotFoundException("No assigned lead");
    const activities = await this.database.query<ActivityRow>(
      `SELECT * FROM lead_activities WHERE lead_id = $1 ORDER BY created_at DESC, id DESC LIMIT 100`, [id],
    );
    return { ...leadView(found.rows[0]), activities: activities.rows.map(activityView) };
  }

  async update(user: AuthenticatedUser, id: string, body: UpdateLeadDto) {
    const status = body.status.trim();
    if (!status) throw new BadRequestException("Status is required");
    return this.database.transaction(async (client) => {
      const changed = await client.query<LeadRow>(
        `UPDATE sales_leads l SET status = $3
         FROM sales_agent_profiles p
         WHERE l.id = $1 AND l.assigned_agent_user_id = $2
           AND p.user_id = l.assigned_agent_user_id AND p.status = 'active'
         RETURNING l.*`, [id, user.userId, status],
      );
      if (!changed.rows[0]) throw new NotFoundException("No assigned lead");
      await this.audit.record({ actorUserId: user.userId, action: "sales_lead.status_updated", targetType: "sales_lead", targetId: id }, client);
      return leadView(changed.rows[0]);
    });
  }

  async activity(user: AuthenticatedUser, id: string, body: AddLeadActivityDto) {
    if (body.notes !== undefined && !body.notes.trim()) throw new BadRequestException("Notes cannot be blank");
    return this.database.transaction(async (client) => {
      const lead = await client.query(
        `SELECT 1 FROM sales_leads l JOIN sales_agent_profiles p ON p.user_id = l.assigned_agent_user_id
         WHERE l.id = $1 AND l.assigned_agent_user_id = $2 AND p.status = 'active' FOR UPDATE OF l`,
        [id, user.userId],
      );
      if (!lead.rowCount) throw new NotFoundException("No assigned lead");
      const inserted = await client.query<ActivityRow>(
        `INSERT INTO lead_activities (lead_id, actor_user_id, activity_type, notes, follow_up_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id, user.userId, body.activityType, body.notes?.trim() ?? null,
          body.followUpAt ? new Date(body.followUpAt) : null],
      );
      await this.audit.record({ actorUserId: user.userId, action: "sales_lead.activity_added", targetType: "sales_lead", targetId: id }, client);
      return activityView(inserted.rows[0]);
    });
  }

  async performance(user: AuthenticatedUser) {
    const found = await this.database.query<{ total: string; converted: string; follow_ups_due: string }>(
      `SELECT
        (SELECT count(*) FROM sales_leads WHERE assigned_agent_user_id = $1) AS total,
        (SELECT count(*) FROM sales_leads WHERE assigned_agent_user_id = $1 AND converted_vendor_id IS NOT NULL) AS converted,
        (SELECT count(*) FROM lead_activities a JOIN sales_leads l ON l.id = a.lead_id
         WHERE l.assigned_agent_user_id = $1 AND a.follow_up_at <= CURRENT_TIMESTAMP) AS follow_ups_due
       WHERE EXISTS (SELECT 1 FROM sales_agent_profiles WHERE user_id = $1 AND status = 'active')`,
      [user.userId],
    );
    if (!found.rows[0]) throw new NotFoundException("No active sales-agent profile");
    return { totalLeads: Number(found.rows[0].total), convertedLeads: Number(found.rows[0].converted),
      followUpActivitiesElapsed: Number(found.rows[0].follow_ups_due) };
  }

  async adminLeads() {
    const found = await this.database.query<LeadRow>(
      `SELECT * FROM sales_leads ORDER BY updated_at DESC, id DESC LIMIT 100`,
    );
    return { items: found.rows.map(leadView) };
  }
}
