import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

/** Fixed-window counter shared by every module (PRS 16). Limits are always
 * passed in from configuration; this class holds no policy values. */
@Injectable()
export class RateLimitService {
  constructor(private readonly database: DatabaseService) {}

  /** Counts one hit and returns the count inside the current window. */
  async hit(
    scope: string,
    subjectHash: string,
    windowSeconds: number,
  ): Promise<number> {
    const result = await this.database.query<{ request_count: number }>(
      `INSERT INTO auth_rate_limit_buckets
         (scope, subject_hash, window_ends_at, request_count)
       VALUES ($1, $2, CURRENT_TIMESTAMP + ($3 * INTERVAL '1 second'), 1)
       ON CONFLICT (scope, subject_hash) DO UPDATE
       SET request_count = CASE
             WHEN auth_rate_limit_buckets.window_ends_at <= CURRENT_TIMESTAMP
               THEN 1
             ELSE auth_rate_limit_buckets.request_count + 1
           END,
           window_ends_at = CASE
             WHEN auth_rate_limit_buckets.window_ends_at <= CURRENT_TIMESTAMP
               THEN CURRENT_TIMESTAMP + ($3 * INTERVAL '1 second')
             ELSE auth_rate_limit_buckets.window_ends_at
           END,
           updated_at = CURRENT_TIMESTAMP
       RETURNING request_count`,
      [scope, subjectHash, windowSeconds],
    );
    const count = result.rows[0]?.request_count;
    if (count === undefined) {
      throw new Error("Rate-limit counter was not returned by the database");
    }
    return count;
  }

  /** Counts one hit and throws 429 when the window's maximum is exceeded. */
  async consume(
    scope: string,
    subjectHash: string,
    max: number,
    windowSeconds: number,
    message = "Rate limit exceeded",
  ): Promise<void> {
    if ((await this.hit(scope, subjectHash, windowSeconds)) > max) {
      throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async purgeExpired(): Promise<void> {
    await this.database.query(
      `DELETE FROM auth_rate_limit_buckets
       WHERE window_ends_at <= CURRENT_TIMESTAMP`,
    );
  }
}
