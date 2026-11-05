import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import {
  CreateDataRequestDto,
  NotificationPreferenceDto,
} from "./dto/settings.dto";

export interface SessionView {
  id: string;
  createdAt: string;
  expiresAt: string;
  device: Record<string, unknown>;
  current: boolean;
}

export interface DataRequestView {
  id: string;
  type: "export" | "deletion";
  status: string;
  requestedAt: string;
  completedAt: string | null;
}

interface DataRequestRow {
  id: string;
  request_type: "export" | "deletion";
  status: string;
  requested_at: Date;
  completed_at: Date | null;
}

const UNIQUE_VIOLATION = "23505";
const DATA_REQUEST_COLUMNS = `id, request_type, status, requested_at, completed_at`;

/**
 * F-ACC-07 settings, F-ACC-08 session list, F-ACC-04/05 data requests. Every
 * statement is scoped to the authenticated user id.
 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async listSessions(user: AuthenticatedUser): Promise<SessionView[]> {
    const result = await this.database.query<{
      id: string;
      created_at: Date;
      expires_at: Date;
      device_metadata: Record<string, unknown>;
    }>(
      `SELECT id, created_at, expires_at, device_metadata
       FROM auth_sessions
       WHERE user_id = $1 AND revoked_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC`,
      [user.userId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at.toISOString(),
      expiresAt: row.expires_at.toISOString(),
      device: row.device_metadata,
      current: row.id === user.sessionId,
    }));
  }

  async revokeSession(
    user: AuthenticatedUser,
    sessionId: string,
  ): Promise<void> {
    await this.database.transaction(async (client) => {
      const result = await client.query(
        `UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
        [sessionId, user.userId],
      );
      if (result.rowCount !== 1) {
        throw new NotFoundException("No active session with that id");
      }
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "session.revoke",
          targetType: "session",
          targetId: sessionId,
        },
        client,
      );
    });
  }

  async listNotificationPreferences(
    user: AuthenticatedUser,
  ): Promise<NotificationPreferenceDto[]> {
    const result = await this.database.query<NotificationPreferenceDto>(
      `SELECT channel, category, enabled
       FROM notification_preferences
       WHERE user_id = $1
       ORDER BY category, channel`,
      [user.userId],
    );
    return result.rows;
  }

  async updateNotificationPreferences(
    user: AuthenticatedUser,
    preferences: NotificationPreferenceDto[],
  ): Promise<NotificationPreferenceDto[]> {
    await this.database.transaction(async (client) => {
      for (const preference of preferences) {
        await client.query(
          `INSERT INTO notification_preferences
             (user_id, channel, category, enabled)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, channel, category)
           DO UPDATE SET enabled = EXCLUDED.enabled`,
          [
            user.userId,
            preference.channel,
            preference.category,
            preference.enabled,
          ],
        );
      }
    });
    return this.listNotificationPreferences(user);
  }

  async listDataRequests(user: AuthenticatedUser): Promise<DataRequestView[]> {
    const result = await this.database.query<DataRequestRow>(
      `SELECT ${DATA_REQUEST_COLUMNS}
       FROM account_data_requests
       WHERE user_id = $1
       ORDER BY requested_at DESC`,
      [user.userId],
    );
    return result.rows.map(toDataRequestView);
  }

  async createDataRequest(
    user: AuthenticatedUser,
    request: CreateDataRequestDto,
  ): Promise<DataRequestView> {
    try {
      return await this.database.transaction(async (client) => {
        const result = await client.query<DataRequestRow>(
          `INSERT INTO account_data_requests (user_id, request_type)
           VALUES ($1, $2)
           RETURNING ${DATA_REQUEST_COLUMNS}`,
          [user.userId, request.type],
        );
        const row = result.rows[0];
        await this.audit.record(
          {
            actorUserId: user.userId,
            action: `account.${request.type}_requested`,
            targetType: "account_data_request",
            targetId: row.id,
          },
          client,
        );
        return toDataRequestView(row);
      });
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          `A ${request.type} request is already open`,
        );
      }
      throw error;
    }
  }

  async cancelDataRequest(
    user: AuthenticatedUser,
    requestId: string,
  ): Promise<DataRequestView> {
    return this.database.transaction(async (client) => {
      const result = await client.query<DataRequestRow>(
        `UPDATE account_data_requests SET status = 'cancelled'
         WHERE id = $1 AND user_id = $2
           AND status IN ('requested', 'verified')
         RETURNING ${DATA_REQUEST_COLUMNS}`,
        [requestId, user.userId],
      );
      const row = result.rows[0];
      if (!row) {
        throw new NotFoundException("No cancellable request with that id");
      }
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: `account.${row.request_type}_cancelled`,
          targetType: "account_data_request",
          targetId: row.id,
        },
        client,
      );
      return toDataRequestView(row);
    });
  }
}

function toDataRequestView(row: DataRequestRow): DataRequestView {
  return {
    id: row.id,
    type: row.request_type,
    status: row.status,
    requestedAt: row.requested_at.toISOString(),
    completedAt: row.completed_at?.toISOString() ?? null,
  };
}
