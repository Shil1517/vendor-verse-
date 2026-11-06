import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PoolClient } from "pg";
import { DatabaseService } from "../database/database.service";

export interface OutboxRecord {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  attempts: number;
}

export interface OutboxHandler {
  /** Exact `event_type` this handler consumes. */
  readonly eventType: string;
  /**
   * Must be idempotent: an event is redelivered after a failure or a crash.
   * Throwing schedules a retry; after the last attempt the event is dead-lettered.
   */
  handle(event: OutboxRecord): Promise<void>;
}

/**
 * Engineering tuning for the dispatcher. These are operational knobs, not
 * product values; they are not part of any user-facing rule.
 */
export const OUTBOX_BATCH_SIZE = 20;
export const OUTBOX_MAX_ATTEMPTS = 8;
export const OUTBOX_RETRY_BASE_SECONDS = 30;
export const OUTBOX_POLL_INTERVAL_MS = 2000;

interface OutboxRow {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  attempts: number;
}

/**
 * Drains `outbox_events`. Rows are claimed with FOR UPDATE SKIP LOCKED inside a
 * transaction, so several instances can run without handling the same event,
 * and a crash releases the claim. Events nobody handles are marked processed.
 */
@Injectable()
export class OutboxDispatcherService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(OutboxDispatcherService.name);
  private readonly handlers = new Map<string, OutboxHandler[]>();
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  register(handler: OutboxHandler): void {
    const existing = this.handlers.get(handler.eventType) ?? [];
    this.handlers.set(handler.eventType, [...existing, handler]);
  }

  onApplicationBootstrap(): void {
    // Tests drive dispatchBatch() directly.
    if (this.config.get("APP_ENV") === "test") return;
    this.timer = setInterval(() => {
      void this.tick();
    }, OUTBOX_POLL_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      let handled: number;
      do {
        handled = await this.dispatchBatch();
      } while (handled === OUTBOX_BATCH_SIZE);
    } catch (error) {
      this.logger.error(
        `Outbox poll failed: ${error instanceof Error ? error.message : error}`,
      );
    } finally {
      this.running = false;
    }
  }

  /** Handles up to one batch of due events. Returns how many were claimed. */
  async dispatchBatch(): Promise<number> {
    return this.database.transaction(async (client) => {
      const claimed = await client.query<OutboxRow>(
        `SELECT id, aggregate_type, aggregate_id, event_type, payload, attempts
         FROM outbox_events
         WHERE processed_at IS NULL AND dead_lettered_at IS NULL
           AND available_at <= CURRENT_TIMESTAMP
         ORDER BY available_at, created_at
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [OUTBOX_BATCH_SIZE],
      );
      for (const row of claimed.rows) {
        await this.handleOne(client, row);
      }
      return claimed.rowCount ?? 0;
    });
  }

  private async handleOne(client: PoolClient, row: OutboxRow): Promise<void> {
    const event: OutboxRecord = {
      id: row.id,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      eventType: row.event_type,
      payload: row.payload,
      attempts: row.attempts,
    };
    try {
      for (const handler of this.handlers.get(row.event_type) ?? []) {
        await handler.handle(event);
      }
      await client.query(
        `UPDATE outbox_events
         SET processed_at = CURRENT_TIMESTAMP, attempts = attempts + 1,
             last_error = NULL
         WHERE id = $1`,
        [row.id],
      );
    } catch (error) {
      const message = (
        error instanceof Error ? error.message : String(error)
      ).slice(0, 1000);
      const attempts = row.attempts + 1;
      if (attempts >= OUTBOX_MAX_ATTEMPTS) {
        this.logger.error(`Outbox event ${row.id} dead-lettered: ${message}`);
        await client.query(
          `UPDATE outbox_events
           SET attempts = $2, last_error = $3, dead_lettered_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [row.id, attempts, message],
        );
        return;
      }
      await client.query(
        `UPDATE outbox_events
         SET attempts = $2, last_error = $3,
             available_at = CURRENT_TIMESTAMP + make_interval(secs => $4)
         WHERE id = $1`,
        [row.id, attempts, message, retryDelaySeconds(attempts)],
      );
    }
  }
}

/** Exponential backoff: base, 2x base, 4x base, ... */
export function retryDelaySeconds(attempts: number): number {
  return OUTBOX_RETRY_BASE_SECONDS * 2 ** (attempts - 1);
}
