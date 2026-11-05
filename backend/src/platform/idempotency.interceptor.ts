import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";
import { Request, Response } from "express";
import { Observable, from } from "rxjs";
import { DatabaseService } from "../database/database.service";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const MAX_KEY_LENGTH = 255;

interface StoredKey {
  request_hash: string;
  response_status: number | null;
  response_body: unknown;
  in_flight: boolean;
}

/**
 * Honours the `Idempotency-Key` header on every write (F-BKG-08). The same key
 * with the same request replays the first response; the same key with a
 * different request is rejected (422); a concurrent duplicate gets 409.
 * A request without the header is processed normally. Retention and lock
 * lifetime come from configuration (IDEMPOTENCY_TTL_SECONDS,
 * IDEMPOTENCY_LOCK_SECONDS); they have no code defaults.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { authenticatedUser?: { userId: string } }>();
    const header = request.headers["idempotency-key"];
    if (SAFE_METHODS.has(request.method) || header === undefined) {
      return next.handle();
    }
    const key = Array.isArray(header) ? header.join(",") : header;
    if (key.trim() === "" || key.length > MAX_KEY_LENGTH) {
      throw new BadRequestException(
        `Idempotency-Key must be 1 to ${MAX_KEY_LENGTH} characters`,
      );
    }
    const response = context.switchToHttp().getResponse<Response>();
    return from(this.run(request, response, key, next));
  }

  private async run(
    request: Request & { authenticatedUser?: { userId: string } },
    response: Response,
    key: string,
    next: CallHandler,
  ): Promise<unknown> {
    const caller = request.authenticatedUser?.userId ?? `anon:${request.ip}`;
    const scope = `${caller}:${request.method} ${request.path}`;
    const hash = createHash("sha256")
      .update(
        `${request.method}\n${request.path}\n${JSON.stringify(request.body ?? null)}`,
      )
      .digest("hex");
    const ttl = this.config.getOrThrow<number>("IDEMPOTENCY_TTL_SECONDS");
    const lock = this.config.getOrThrow<number>("IDEMPOTENCY_LOCK_SECONDS");

    await this.database.query(
      `DELETE FROM idempotency_keys
       WHERE scope = $1 AND idempotency_key = $2
         AND expires_at <= CURRENT_TIMESTAMP`,
      [scope, key],
    );
    const claimed = await this.database.query(
      `INSERT INTO idempotency_keys
         (scope, idempotency_key, request_hash, locked_until, expires_at)
       VALUES ($1, $2, $3,
               CURRENT_TIMESTAMP + ($4 * INTERVAL '1 second'),
               CURRENT_TIMESTAMP + ($5 * INTERVAL '1 second'))
       ON CONFLICT (scope, idempotency_key) DO NOTHING`,
      [scope, key, hash, lock, ttl],
    );

    if (claimed.rowCount !== 1) {
      const stored = await this.database.query<StoredKey>(
        `SELECT request_hash, response_status, response_body,
                COALESCE(locked_until > CURRENT_TIMESTAMP, false) AS in_flight
         FROM idempotency_keys
         WHERE scope = $1 AND idempotency_key = $2`,
        [scope, key],
      );
      const row = stored.rows[0];
      if (row) {
        if (row.request_hash !== hash) {
          throw new UnprocessableEntityException(
            "Idempotency-Key was already used with a different request",
          );
        }
        if (row.response_status !== null) {
          response.setHeader("Idempotent-Replayed", "true");
          response.status(row.response_status);
          return row.response_body ?? undefined;
        }
        if (row.in_flight) {
          throw new ConflictException(
            "A request with this Idempotency-Key is still being processed",
          );
        }
        await this.database.query(
          `UPDATE idempotency_keys
           SET locked_until = CURRENT_TIMESTAMP + ($3 * INTERVAL '1 second')
           WHERE scope = $1 AND idempotency_key = $2`,
          [scope, key, lock],
        );
      }
    }

    try {
      const body: unknown = await new Promise((resolve, reject) => {
        next.handle().subscribe({
          next: resolve,
          error: reject,
          complete: () => resolve(undefined),
        });
      });
      await this.database.query(
        `UPDATE idempotency_keys
         SET response_status = $3, response_body = $4::jsonb,
             locked_until = NULL
         WHERE scope = $1 AND idempotency_key = $2`,
        [scope, key, response.statusCode, JSON.stringify(body ?? null)],
      );
      return body;
    } catch (error) {
      // A failed attempt is not a stored outcome: free the key so a retry runs.
      await this.database.query(
        `DELETE FROM idempotency_keys
         WHERE scope = $1 AND idempotency_key = $2`,
        [scope, key],
      );
      throw error;
    }
  }
}
