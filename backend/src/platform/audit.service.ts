import { Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { DatabaseService } from "../database/database.service";
import { Queryable } from "./queryable";
import { currentCorrelationId } from "./request-context";

export interface AuditEvent {
  /** Exactly one of actorUserId / actorService must be set (PRS 4.3). */
  actorUserId?: string;
  actorService?: string;
  actorRole?: string;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Appends to the immutable audit trail (F-ADM-05). Pass the transaction's
 * client so the event commits or rolls back with the change it describes.
 * Never put secrets or restricted fields in metadata.
 */
@Injectable()
export class AuditService {
  constructor(private readonly database: DatabaseService) {}

  async record(event: AuditEvent, client?: PoolClient): Promise<void> {
    if (!event.actorUserId && !event.actorService) {
      throw new Error("An audit event needs an actor user or service");
    }
    const runner: Queryable = client ?? this.database;
    await runner.query(
      `INSERT INTO audit_events
         (actor_user_id, actor_service, actor_role, action, target_type,
          target_id, reason, correlation_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
      [
        event.actorUserId ?? null,
        event.actorService ?? null,
        event.actorRole ?? null,
        event.action,
        event.targetType,
        event.targetId,
        event.reason ?? null,
        currentCorrelationId(),
        JSON.stringify(event.metadata ?? {}),
      ],
    );
  }
}
