import { Injectable, NotFoundException } from "@nestjs/common";
import { PoolClient } from "pg";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { OutboxService } from "../platform/outbox.service";
import { NOTIFICATION_CREATED_EVENT } from "./notification-channel.provider";

export interface NotifyInput {
  recipientUserId: string;
  eventType: string;
  /** Preference category (F-ACC-07), e.g. "messages". */
  category: string;
  /** Same key for the same logical event, so retries never duplicate it. */
  dedupeKey: string;
  payload?: Record<string, unknown>;
  /** Deep link target (F-MSG-04). Both or neither. */
  linkedResource?: { type: string; id: string };
}

export interface NotificationView {
  id: string;
  eventType: string;
  category: string;
  payload: Record<string, unknown>;
  linkedResource: { type: string; id: string } | null;
  read: boolean;
  createdAt: string;
}

interface NotificationRow {
  id: string;
  event_type: string;
  category: string;
  payload: Record<string, unknown>;
  linked_resource_type: string | null;
  linked_resource_id: string | null;
  read_at: Date | null;
  created_at: Date;
}

export const INBOX_DEFAULT_LIMIT = 20;
export const INBOX_MAX_LIMIT = 50;

const VIEW_COLUMNS = `id, event_type, category, payload, linked_resource_type,
  linked_resource_id, read_at, created_at`;

/**
 * F-MSG-04 inbox and the entry point other modules use to raise a
 * notification. `notify` writes the inbox row and the outbox event in the
 * caller's transaction, so a notification exists only if the change that
 * caused it committed.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly outbox: OutboxService,
  ) {}

  /** Returns the new id, or null when this dedupe key was already notified. */
  async notify(
    input: NotifyInput,
    client?: PoolClient,
  ): Promise<string | null> {
    const runner = (client ?? this.database) as unknown as Pick<
      DatabaseService,
      "query"
    >;
    const inserted = await runner.query<{ id: string }>(
      `INSERT INTO notifications
         (recipient_user_id, event_type, category, payload,
          linked_resource_type, linked_resource_id, dedupe_key)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
       ON CONFLICT (recipient_user_id, dedupe_key) DO NOTHING
       RETURNING id`,
      [
        input.recipientUserId,
        input.eventType,
        input.category,
        JSON.stringify(input.payload ?? {}),
        input.linkedResource?.type ?? null,
        input.linkedResource?.id ?? null,
        input.dedupeKey,
      ],
    );
    const id = inserted.rows[0]?.id;
    if (!id) return null;
    await this.outbox.enqueue(
      {
        aggregateType: "notification",
        aggregateId: id,
        eventType: NOTIFICATION_CREATED_EVENT,
      },
      client,
    );
    return id;
  }

  async list(
    user: AuthenticatedUser,
    options: { unreadOnly: boolean; limit: number; before?: Date },
  ): Promise<NotificationView[]> {
    const result = await this.database.query<NotificationRow>(
      `SELECT ${VIEW_COLUMNS}
       FROM notifications
       WHERE recipient_user_id = $1
         AND ($2::boolean = false OR read_at IS NULL)
         AND ($3::timestamptz IS NULL OR created_at < $3)
       ORDER BY created_at DESC, id DESC
       LIMIT $4`,
      [
        user.userId,
        options.unreadOnly,
        options.before ?? null,
        Math.min(options.limit, INBOX_MAX_LIMIT),
      ],
    );
    return result.rows.map(toView);
  }

  async unreadCount(user: AuthenticatedUser): Promise<number> {
    const result = await this.database.query<{ count: string }>(
      `SELECT count(*) AS count FROM notifications
       WHERE recipient_user_id = $1 AND read_at IS NULL`,
      [user.userId],
    );
    return Number(result.rows[0].count);
  }

  async markRead(
    user: AuthenticatedUser,
    notificationId: string,
  ): Promise<NotificationView> {
    const result = await this.database.query<NotificationRow>(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE id = $1 AND recipient_user_id = $2
       RETURNING ${VIEW_COLUMNS}`,
      [notificationId, user.userId],
    );
    if (result.rowCount !== 1) {
      throw new NotFoundException("Notification not found");
    }
    return toView(result.rows[0]);
  }

  async markAllRead(user: AuthenticatedUser): Promise<number> {
    const result = await this.database.query(
      `UPDATE notifications SET read_at = CURRENT_TIMESTAMP
       WHERE recipient_user_id = $1 AND read_at IS NULL`,
      [user.userId],
    );
    return result.rowCount ?? 0;
  }
}

function toView(row: NotificationRow): NotificationView {
  return {
    id: row.id,
    eventType: row.event_type,
    category: row.category,
    payload: row.payload,
    linkedResource:
      row.linked_resource_type && row.linked_resource_id
        ? { type: row.linked_resource_type, id: row.linked_resource_id }
        : null,
    read: row.read_at !== null,
    createdAt: row.created_at.toISOString(),
  };
}
