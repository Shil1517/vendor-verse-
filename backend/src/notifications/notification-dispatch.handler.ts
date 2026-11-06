import { Inject, Injectable, OnModuleInit, Optional } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import {
  OutboxDispatcherService,
  OutboxHandler,
  OutboxRecord,
} from "../platform/outbox-dispatcher.service";
import {
  NOTIFICATION_CHANNEL_PROVIDERS,
  NOTIFICATION_CREATED_EVENT,
  NotificationChannelProvider,
} from "./notification-channel.provider";

interface NotificationContext {
  recipient_user_id: string;
  event_type: string;
  category: string;
  payload: Record<string, unknown>;
}

interface TemplateRow {
  channel: "push" | "sms" | "email";
  localized_content: Record<string, unknown>;
  is_mandatory: boolean;
  provider_template_id: string | null;
}

/**
 * Fans a created notification out to push / sms / email. The in-app inbox row
 * already exists. A channel is attempted only when an active template exists
 * for it and the user has not switched it off; mandatory templates ignore
 * preferences (F-ACC-07, PRS 10.2). One delivery attempt row per channel keeps
 * the work idempotent across outbox retries.
 */
@Injectable()
export class NotificationDispatchHandler
  implements OutboxHandler, OnModuleInit
{
  readonly eventType = NOTIFICATION_CREATED_EVENT;
  private readonly providers: Map<string, NotificationChannelProvider>;

  constructor(
    private readonly database: DatabaseService,
    private readonly dispatcher: OutboxDispatcherService,
    @Optional()
    @Inject(NOTIFICATION_CHANNEL_PROVIDERS)
    providers: NotificationChannelProvider[] = [],
  ) {
    this.providers = new Map(providers.map((p) => [p.channel, p]));
  }

  onModuleInit(): void {
    this.dispatcher.register(this);
  }

  async handle(event: OutboxRecord): Promise<void> {
    const notificationId = event.aggregateId;
    const context = await this.database.query<NotificationContext>(
      `SELECT recipient_user_id, event_type, category, payload
       FROM notifications WHERE id = $1`,
      [notificationId],
    );
    const notification = context.rows[0];
    if (!notification) return;

    const templates = await this.database.query<TemplateRow>(
      `SELECT DISTINCT ON (channel)
              channel, localized_content, is_mandatory, provider_template_id
       FROM notification_templates
       WHERE event_type = $1 AND is_active AND channel <> 'in_app'
       ORDER BY channel, version DESC`,
      [notification.event_type],
    );

    let failure: unknown;
    for (const template of templates.rows) {
      const attemptId = await this.claimAttempt(
        notificationId,
        template.channel,
      );
      if (!attemptId) continue; // already sent or skipped on an earlier run

      if (
        !template.is_mandatory &&
        !(await this.isEnabled(notification, template.channel))
      ) {
        await this.finish(attemptId, "skipped", null, "Disabled by user");
        continue;
      }
      const provider = this.providers.get(template.channel);
      if (!provider) {
        await this.finish(
          attemptId,
          "skipped",
          null,
          "No provider configured for this channel",
        );
        continue;
      }
      try {
        const reference = await provider.send({
          notificationId,
          recipientUserId: notification.recipient_user_id,
          eventType: notification.event_type,
          category: notification.category,
          payload: notification.payload,
          localizedContent: template.localized_content,
          providerTemplateId: template.provider_template_id,
        });
        await this.finish(attemptId, "sent", reference, null);
      } catch (error) {
        await this.finish(
          attemptId,
          "failed",
          null,
          error instanceof Error ? error.message : String(error),
        );
        failure ??= error;
      }
    }
    // Rethrow after every channel was tried, so the outbox retries only the
    // failed ones (sent and skipped attempts are not repeated).
    if (failure) throw failure;
  }

  /**
   * Returns the attempt row to work on, or null when that channel is already
   * settled. Pending and failed rows are picked up again on a retry.
   */
  private async claimAttempt(
    notificationId: string,
    channel: string,
  ): Promise<string | null> {
    const key = `${notificationId}:${channel}`;
    await this.database.query(
      `INSERT INTO notification_delivery_attempts
         (notification_id, channel, idempotency_key)
       VALUES ($1, $2, $3)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [notificationId, channel, key],
    );
    const row = await this.database.query<{ id: string; status: string }>(
      `SELECT id, status FROM notification_delivery_attempts
       WHERE idempotency_key = $1`,
      [key],
    );
    const attempt = row.rows[0];
    return attempt && ["pending", "failed"].includes(attempt.status)
      ? attempt.id
      : null;
  }

  /** Unset means enabled: a stored preference can only switch a channel off. */
  private async isEnabled(
    notification: NotificationContext,
    channel: string,
  ): Promise<boolean> {
    const result = await this.database.query<{ enabled: boolean }>(
      `SELECT enabled FROM notification_preferences
       WHERE user_id = $1 AND channel = $2 AND category = $3`,
      [notification.recipient_user_id, channel, notification.category],
    );
    return result.rows[0]?.enabled ?? true;
  }

  private async finish(
    attemptId: string,
    status: "sent" | "failed" | "skipped",
    providerReference: string | null,
    error: string | null,
  ): Promise<void> {
    await this.database.query(
      `UPDATE notification_delivery_attempts
       SET status = $2, provider_reference = $3, error = $4,
           attempted_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [attemptId, status, providerReference, error?.slice(0, 1000) ?? null],
    );
  }
}
