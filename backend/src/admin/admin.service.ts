import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { AuditQueryDto, DecideConfigDto, SetPlatformSettingDto } from "./dto/admin.dto";

interface AuditRow {
  id: string; occurred_at: Date; actor_user_id: string | null; actor_service: string | null;
  actor_role: string | null; action: string; target_type: string; target_id: string;
  reason: string | null; correlation_id: string | null; metadata: Record<string, unknown>;
}
interface ConfigRow {
  code: string; title: string; owner: string; required_decision: string;
  status: string; decided_value: Record<string, unknown> | null;
  decided_by_user_id: string | null; decided_at: Date | null; updated_at: Date;
}
interface SettingRow { key: string; value: Record<string, unknown>; updated_by_user_id: string | null; updated_at: Date }
const configView = (r: ConfigRow) => ({ code: r.code, title: r.title, owner: r.owner,
  requiredDecision: r.required_decision, status: r.status, decidedValue: r.decided_value,
  decidedByUserId: r.decided_by_user_id, decidedAt: r.decided_at, updatedAt: r.updated_at });
const settingView = (r: SettingRow) => ({ key: r.key, value: r.value,
  updatedByUserId: r.updated_by_user_id, updatedAt: r.updated_at });

@Injectable()
export class AdminService {
  constructor(private readonly database: DatabaseService, private readonly auditService: AuditService) {}

  async dashboard() {
    const found = await this.database.query<Record<string, string>>(`SELECT
      (SELECT count(*) FROM verifications WHERE status IN ('submitted', 'in_review')) AS verification_queue,
      (SELECT count(*) FROM listings WHERE content_state = 'pending_review') AS listing_queue,
      (SELECT count(*) FROM reports r WHERE NOT EXISTS
        (SELECT 1 FROM support_cases c WHERE c.report_id = r.id)) AS untriaged_reports,
      (SELECT count(*) FROM appeals WHERE status = 'submitted') AS appeal_queue,
      (SELECT count(*) FROM support_cases WHERE resolved_at IS NULL) AS open_cases,
      (SELECT count(*) FROM subscriptions WHERE state = 'payment_failed') AS failed_subscriptions,
      (SELECT count(*) FROM subscriptions WHERE state = 'payment_failed'
        AND grace_ends_at <= CURRENT_TIMESTAMP) AS elapsed_grace_periods,
      (SELECT count(*) FROM category_suggestions WHERE status = 'submitted') AS category_suggestions,
      (SELECT count(*) FROM market_activations WHERE status = 'not_live') AS inactive_markets`);
    const row = found.rows[0];
    return { counts: Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)])) };
  }

  async audit(query: AuditQueryDto) {
    const found = await this.database.query<AuditRow>(
      `SELECT id, occurred_at, actor_user_id, actor_service, actor_role, action,
              target_type, target_id, reason, correlation_id, metadata
       FROM audit_events
       WHERE ($1::text IS NULL OR action = $1)
         AND ($2::uuid IS NULL OR actor_user_id = $2)
         AND ($3::text IS NULL OR target_type = $3)
         AND ($4::text IS NULL OR target_id = $4)
         AND ($5::text IS NULL OR correlation_id = $5)
       ORDER BY occurred_at DESC, id DESC LIMIT $6`,
      [query.action ?? null, query.actorUserId ?? null, query.targetType ?? null,
        query.targetId ?? null, query.correlationId ?? null, query.limit ?? 50],
    );
    return { items: found.rows.map((r) => ({ id: r.id, occurredAt: r.occurred_at,
      actorUserId: r.actor_user_id, actorService: r.actor_service, actorRole: r.actor_role,
      action: r.action, targetType: r.target_type, targetId: r.target_id,
      reason: r.reason, correlationId: r.correlation_id, metadata: r.metadata })) };
  }

  async config() {
    const found = await this.database.query<ConfigRow>(`SELECT * FROM config_register_items ORDER BY code`);
    return { items: found.rows.map(configView) };
  }

  async configItem(code: string) {
    if (!/^CFG-[0-9]{2}$/.test(code)) throw new BadRequestException("Invalid configuration code");
    const found = await this.database.query<ConfigRow>(`SELECT * FROM config_register_items WHERE code = $1`, [code]);
    if (!found.rows[0]) throw new NotFoundException("No such configuration item");
    return configView(found.rows[0]);
  }

  async decideConfig(actor: AuthenticatedUser, code: string, body: DecideConfigDto) {
    if (!/^CFG-[0-9]{2}$/.test(code)) throw new BadRequestException("Invalid configuration code");
    const reason = body.reason.trim();
    if (!reason || !body.decidedValue || Array.isArray(body.decidedValue)) throw new BadRequestException("Decision and reason are required");
    return this.database.transaction(async (client) => {
      const found = await client.query<ConfigRow>(`SELECT * FROM config_register_items WHERE code = $1 FOR UPDATE`, [code]);
      if (!found.rows[0]) throw new NotFoundException("No such configuration item");
      const updated = await client.query<ConfigRow>(
        `UPDATE config_register_items SET status = 'decided', decided_value = $2::jsonb,
          decided_by_user_id = $3, decided_at = CURRENT_TIMESTAMP WHERE code = $1 RETURNING *`,
        [code, JSON.stringify(body.decidedValue), actor.userId],
      );
      await this.auditService.record({ actorUserId: actor.userId, action: "config.decided",
        targetType: "config_register_item", targetId: code, reason,
        metadata: { previousStatus: found.rows[0].status } }, client);
      return configView(updated.rows[0]);
    });
  }

  async settings() {
    const found = await this.database.query<SettingRow>(`SELECT * FROM platform_settings ORDER BY key`);
    return { items: found.rows.map(settingView) };
  }

  async setting(key: string) {
    this.validateKey(key);
    const found = await this.database.query<SettingRow>(`SELECT * FROM platform_settings WHERE key = $1`, [key]);
    if (!found.rows[0]) throw new NotFoundException("No such platform setting");
    return settingView(found.rows[0]);
  }

  async putSetting(actor: AuthenticatedUser, key: string, body: SetPlatformSettingDto) {
    this.validateKey(key);
    const reason = body.reason.trim();
    if (!reason || !body.value || Array.isArray(body.value)) throw new BadRequestException("Setting value and reason are required");
    return this.database.transaction(async (client) => {
      const updated = await client.query<SettingRow>(
        `INSERT INTO platform_settings (key, value, updated_by_user_id)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value,
           updated_by_user_id = EXCLUDED.updated_by_user_id, updated_at = CURRENT_TIMESTAMP
         RETURNING *`, [key, JSON.stringify(body.value), actor.userId],
      );
      await this.auditService.record({ actorUserId: actor.userId, action: "platform_setting.updated",
        targetType: "platform_setting", targetId: key, reason }, client);
      return settingView(updated.rows[0]);
    });
  }

  private validateKey(key: string) {
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,99}$/.test(key)) throw new BadRequestException("Invalid platform setting key");
  }
}
