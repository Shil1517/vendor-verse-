import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { CreatePlanDto, CreatePlanVersionDto, MonitorSubscriptionsDto, SetPlanStatusDto } from "./dto/subscription.dto";

interface PlanRow {
  id: string; name: string; status: string; created_at: Date; updated_at: Date;
  version_id: string | null; version_number: number | null; price_minor: string | null;
  currency: string | null; billing_interval: string | null; entitlements: Record<string, unknown> | null;
}
interface SubscriptionRow {
  id: string; vendor_id: string; plan_version_id: string; state: string;
  current_period_start: Date | null; current_period_end: Date | null;
  grace_ends_at: Date | null; scheduled_plan_version_id: string | null;
  created_at: Date; updated_at: Date; plan_name: string;
}
const PLAN_SELECT = `SELECT p.id, p.name, p.status, p.created_at, p.updated_at,
  v.id AS version_id, v.version_number, v.price_minor, v.currency, v.billing_interval,
  (SELECT COALESCE(jsonb_object_agg(e.entitlement_key, e.configured_value), '{}'::jsonb)
   FROM plan_entitlements e WHERE e.plan_version_id = v.id) AS entitlements
  FROM plans p LEFT JOIN LATERAL
    (SELECT * FROM plan_versions WHERE plan_id = p.id ORDER BY version_number DESC LIMIT 1) v ON true`;
const planView = (r: PlanRow) => ({ id: r.id, name: r.name, status: r.status,
  version: r.version_number, versionId: r.version_id, priceMinor: r.price_minor,
  currency: r.currency, billingInterval: r.billing_interval,
  entitlements: r.entitlements ?? {}, createdAt: r.created_at, updatedAt: r.updated_at });
const subscriptionView = (r: SubscriptionRow) => ({ id: r.id, vendorId: r.vendor_id,
  planVersionId: r.plan_version_id, planName: r.plan_name, state: r.state,
  currentPeriodStart: r.current_period_start, currentPeriodEnd: r.current_period_end,
  graceEndsAt: r.grace_ends_at, scheduledPlanVersionId: r.scheduled_plan_version_id,
  createdAt: r.created_at, updatedAt: r.updated_at });

@Injectable()
export class SubscriptionsService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  async publicPlans() {
    const found = await this.database.query<PlanRow>(`${PLAN_SELECT} WHERE p.status = 'active' ORDER BY p.name`);
    return { items: found.rows.map(planView) };
  }

  async publicPlan(id: string) {
    const found = await this.database.query<PlanRow>(`${PLAN_SELECT} WHERE p.id = $1 AND p.status = 'active'`, [id]);
    if (!found.rows[0]) throw new NotFoundException("No active plan");
    return planView(found.rows[0]);
  }

  async adminPlans() {
    const found = await this.database.query<PlanRow>(`${PLAN_SELECT} ORDER BY p.name`);
    return { items: found.rows.map(planView) };
  }

  async createPlan(actor: AuthenticatedUser, body: CreatePlanDto) {
    const name = body.name.trim();
    if (!name) throw new BadRequestException("Plan name is required");
    try {
      return await this.database.transaction(async (client) => {
        const inserted = await client.query<{ id: string }>(`INSERT INTO plans (name) VALUES ($1) RETURNING id`, [name]);
        await this.audit.record({ actorUserId: actor.userId, action: "plan.created", targetType: "plan", targetId: inserted.rows[0].id }, client);
        return { id: inserted.rows[0].id, name, status: "draft" };
      });
    } catch (error) {
      if ((error as { code?: string })?.code === "23505") throw new ConflictException("Plan name already exists");
      throw error;
    }
  }

  async createVersion(actor: AuthenticatedUser, id: string, body: CreatePlanVersionDto) {
    const currency = body.currency?.trim().toUpperCase();
    const interval = body.billingInterval?.trim();
    if (body.priceMinor !== undefined && !currency) throw new BadRequestException("Currency is required with a price");
    if (currency && !/^[A-Z]{3}$/.test(currency)) throw new BadRequestException("Invalid currency");
    if (body.billingInterval !== undefined && !interval) throw new BadRequestException("Billing interval cannot be blank");
    if (!body.entitlements || Array.isArray(body.entitlements)) throw new BadRequestException("Entitlements must be an object");
    const entries = Object.entries(body.entitlements);
    if (entries.some(([key]) => !key.trim() || key.length > 100)) throw new BadRequestException("Invalid entitlement key");
    return this.database.transaction(async (client) => {
      const plan = await client.query<{ status: string }>(`SELECT status FROM plans WHERE id = $1 FOR UPDATE`, [id]);
      if (!plan.rows[0]) throw new NotFoundException("No such plan");
      if (plan.rows[0].status === "retired") throw new ConflictException("A retired plan cannot receive new versions");
      if (plan.rows[0].status === "active" && (body.priceMinor === undefined || !currency || !interval)) {
        throw new BadRequestException("An active plan needs price, currency and billing interval");
      }
      const next = await client.query<{ version_number: number }>(
        `SELECT COALESCE(max(version_number), 0) + 1 AS version_number FROM plan_versions WHERE plan_id = $1`, [id],
      );
      const version = next.rows[0].version_number;
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO plan_versions (plan_id, version_number, price_minor, currency, billing_interval)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [id, version, body.priceMinor ?? null, currency ?? null, interval ?? null],
      );
      for (const [key, value] of entries) {
        await client.query(`INSERT INTO plan_entitlements (plan_version_id, entitlement_key, configured_value)
          VALUES ($1, $2, $3::jsonb)`, [inserted.rows[0].id, key, JSON.stringify(value)]);
      }
      await this.audit.record({ actorUserId: actor.userId, action: "plan.version_created", targetType: "plan", targetId: id,
        metadata: { version } }, client);
      return { planId: id, versionId: inserted.rows[0].id, version };
    });
  }

  async setStatus(actor: AuthenticatedUser, id: string, body: SetPlanStatusDto) {
    const reason = body.reason.trim();
    if (!reason) throw new BadRequestException("Reason is required");
    return this.database.transaction(async (client) => {
      const found = await client.query<{ status: string }>(`SELECT status FROM plans WHERE id = $1 FOR UPDATE`, [id]);
      if (!found.rows[0]) throw new NotFoundException("No such plan");
      if (found.rows[0].status === body.status) throw new ConflictException("Plan already has this status");
      if (body.status === "active") {
        const version = await client.query<{ price_minor: string | null; currency: string | null; billing_interval: string | null }>(
          `SELECT price_minor, currency, billing_interval FROM plan_versions
           WHERE plan_id = $1 ORDER BY version_number DESC LIMIT 1`, [id],
        );
        const latest = version.rows[0];
        if (!latest || latest.price_minor === null || !latest.currency || !latest.billing_interval) {
          throw new ConflictException("Plan needs a priced version before activation");
        }
      }
      await client.query(`UPDATE plans SET status = $2 WHERE id = $1`, [id, body.status]);
      await this.audit.record({ actorUserId: actor.userId, action: "plan.status_changed", targetType: "plan", targetId: id,
        reason, metadata: { from: found.rows[0].status, to: body.status } }, client);
      return { id, status: body.status };
    });
  }

  private async requireOwned(user: AuthenticatedUser, vendorId: string) {
    const owned = await this.database.query(`SELECT 1 FROM vendors WHERE id = $1 AND owner_user_id = $2`, [vendorId, user.userId]);
    if (!owned.rowCount) throw new NotFoundException("No such vendor for this user");
  }

  async vendorSubscription(user: AuthenticatedUser, vendorId: string) {
    await this.requireOwned(user, vendorId);
    const found = await this.database.query<SubscriptionRow>(
      `SELECT s.*, p.name AS plan_name FROM subscriptions s
       JOIN plan_versions v ON v.id = s.plan_version_id JOIN plans p ON p.id = v.plan_id
       WHERE s.vendor_id = $1 ORDER BY s.created_at DESC, s.id DESC LIMIT 1`, [vendorId],
    );
    return { subscription: found.rows[0] ? subscriptionView(found.rows[0]) : null };
  }

  async vendorLeadUsage(user: AuthenticatedUser, vendorId: string) {
    await this.requireOwned(user, vendorId);
    const found = await this.database.query<{ period_start: Date; period_end: Date; lead_count: number }>(
      `SELECT period_start, period_end, lead_count FROM lead_usage WHERE vendor_id = $1
       ORDER BY period_start DESC LIMIT 12`, [vendorId],
    );
    return { items: found.rows.map((row) => ({ periodStart: row.period_start,
      periodEnd: row.period_end, leadCount: row.lead_count })) };
  }

  async monitor(query: MonitorSubscriptionsDto) {
    const found = await this.database.query<SubscriptionRow>(
      `SELECT s.*, p.name AS plan_name FROM subscriptions s
       JOIN plan_versions v ON v.id = s.plan_version_id JOIN plans p ON p.id = v.plan_id
       WHERE ($1::text IS NULL OR s.state = $1)
       ORDER BY s.updated_at DESC, s.id DESC LIMIT 100`, [query.state ?? null],
    );
    return { items: found.rows.map(subscriptionView) };
  }
}
