import { Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { DatabaseService } from "../database/database.service";
import { Queryable } from "./queryable";

export interface OutboxEvent {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload?: Record<string, unknown>;
}

/**
 * Transactional outbox: write the event in the same transaction as the data,
 * workers dispatch it later (search indexer, notification dispatch).
 */
@Injectable()
export class OutboxService {
  constructor(private readonly database: DatabaseService) {}

  async enqueue(event: OutboxEvent, client?: PoolClient): Promise<void> {
    const runner: Queryable = client ?? this.database;
    await runner.query(
      `INSERT INTO outbox_events
         (aggregate_type, aggregate_id, event_type, payload)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [
        event.aggregateType,
        event.aggregateId,
        event.eventType,
        JSON.stringify(event.payload ?? {}),
      ],
    );
  }
}
