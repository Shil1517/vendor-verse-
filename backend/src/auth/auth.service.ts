import {
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { PoolClient } from "pg";
import { AppEnvironmentConfig } from "../config/environment";
import { DatabaseService } from "../database/database.service";
import { AuthenticatedUser } from "./authenticated-user.decorator";
import { OTP_DELIVERY_PROVIDER } from "./auth.constants";
import { OtpRequestDto } from "./dto/otp-request.dto";
import { OtpDeliveryProvider } from "./otp-delivery.provider";

interface ChallengeRow {
  id: string;
  user_id: string | null;
  channel: "phone" | "email";
  identifier_value: string;
  verifier_hash: string;
  expires_at: Date;
  consumed_at: Date | null;
  failed_attempts: number;
}

export interface SessionCredentials {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
}

type VerificationResult =
  | { kind: "unauthorized" }
  | { kind: "attempts_exceeded" }
  | { kind: "mfa_required" }
  | { kind: "credentials"; credentials: SessionCredentials };

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService<AppEnvironmentConfig, true>,
    private readonly jwt: JwtService,
    @Inject(OTP_DELIVERY_PROVIDER)
    private readonly otpDelivery: OtpDeliveryProvider,
  ) {}

  async requestOtp(
    request: OtpRequestDto,
  ): Promise<{ challengeId: string; expiresAt: string }> {
    const identifier = this.normalizeIdentifier(
      request.channel,
      request.identifier,
    );
    const identifierHash = this.signValue(
      `${request.channel}:${identifier}`,
      this.config.get("OTP_VERIFIER_SECRET", { infer: true }),
    );
    const requestCount = await this.database.query<{ request_count: number }>(
      `INSERT INTO auth_rate_limit_buckets
         (scope, subject_hash, window_ends_at, request_count)
       VALUES
         ('otp_request', $1,
          CURRENT_TIMESTAMP + ($2 * INTERVAL '1 second'), 1)
       ON CONFLICT (scope, subject_hash) DO UPDATE
       SET request_count = CASE
             WHEN auth_rate_limit_buckets.window_ends_at <= CURRENT_TIMESTAMP
               THEN 1
             ELSE auth_rate_limit_buckets.request_count + 1
           END,
           window_ends_at = CASE
             WHEN auth_rate_limit_buckets.window_ends_at <= CURRENT_TIMESTAMP
               THEN CURRENT_TIMESTAMP + ($2 * INTERVAL '1 second')
             ELSE auth_rate_limit_buckets.window_ends_at
           END,
           updated_at = CURRENT_TIMESTAMP
       RETURNING request_count`,
      [
        identifierHash,
        this.config.get("OTP_REQUEST_WINDOW_SECONDS", { infer: true }),
      ],
    );
    const count = requestCount.rows[0]?.request_count;
    if (count === undefined) {
      throw new Error(
        "OTP rate-limit counter was not returned by the database",
      );
    }
    if (count > this.config.get("OTP_REQUEST_MAX", { infer: true })) {
      throw new HttpException(
        "OTP request limit exceeded",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    await this.database.query(
      `DELETE FROM auth_challenges
       WHERE expires_at <= CURRENT_TIMESTAMP`,
    );
    await this.database.query(
      `DELETE FROM auth_rate_limit_buckets
       WHERE window_ends_at <= CURRENT_TIMESTAMP`,
    );

    const challengeId = randomUUID();
    const code = await this.otpDelivery.issue();
    const expiresAt = new Date(
      Date.now() +
        this.config.get("OTP_CHALLENGE_TTL_SECONDS", { infer: true }) * 1000,
    );
    const identifierRow = await this.database.query<{ user_id: string }>(
      `SELECT user_id
       FROM user_identifiers
       WHERE channel = $1 AND normalized_value = $2`,
      [request.channel, identifier],
    );
    await this.database.query(
      `INSERT INTO auth_challenges
         (id, user_id, channel, identifier_value, purpose,
          verifier_hash, expires_at)
       VALUES ($1, $2, $3, $4, 'otp', $5, $6)`,
      [
        challengeId,
        identifierRow.rows[0]?.user_id ?? null,
        request.channel,
        identifier,
        this.signValue(
          code,
          this.config.get("OTP_VERIFIER_SECRET", { infer: true }),
        ),
        expiresAt,
      ],
    );
    return { challengeId, expiresAt: expiresAt.toISOString() };
  }

  async verifyOtp(request: {
    challengeId: string;
    code: string;
  }): Promise<SessionCredentials> {
    const result = await this.database.transaction<VerificationResult>(
      async (client) => {
        const challenge = await client.query<ChallengeRow>(
          `SELECT id, user_id, channel, identifier_value, verifier_hash,
                  expires_at, consumed_at, failed_attempts
           FROM auth_challenges
           WHERE id = $1 AND purpose = 'otp'
           FOR UPDATE`,
          [request.challengeId],
        );
        const row = challenge.rows[0];
        if (!row || row.consumed_at || row.expires_at <= new Date()) {
          return { kind: "unauthorized" };
        }
        if (
          row.failed_attempts >=
          this.config.get("OTP_VERIFY_MAX", { infer: true })
        ) {
          return { kind: "attempts_exceeded" };
        }

        const submittedHash = this.signValue(
          request.code,
          this.config.get("OTP_VERIFIER_SECRET", { infer: true }),
        );
        if (!this.matchesHash(row.verifier_hash, submittedHash)) {
          const attempts = await client.query<{ failed_attempts: number }>(
            `UPDATE auth_challenges
             SET failed_attempts = failed_attempts + 1
             WHERE id = $1
             RETURNING failed_attempts`,
            [row.id],
          );
          return {
            kind:
              Number(attempts.rows[0]?.failed_attempts) >=
              this.config.get("OTP_VERIFY_MAX", { infer: true })
                ? "attempts_exceeded"
                : "unauthorized",
          };
        }

        const userId = await this.resolveVerifiedUser(client, row);
        const roles = await client.query<{ role_code: string }>(
          `SELECT role_code
           FROM user_role_assignments
           WHERE user_id = $1 AND revoked_at IS NULL`,
          [userId],
        );
        await client.query(
          `UPDATE auth_challenges
           SET consumed_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [row.id],
        );
        if (
          roles.rows.some((role) =>
            ["SALES_AGENT", "SUPER_ADMIN"].includes(role.role_code),
          )
        ) {
          return { kind: "mfa_required" };
        }

        return {
          kind: "credentials",
          credentials: await this.createSession(client, userId),
        };
      },
    );

    if (result.kind === "attempts_exceeded") {
      throw new HttpException(
        "OTP verification limit exceeded",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (result.kind === "unauthorized") {
      throw new UnauthorizedException("OTP challenge is invalid or expired");
    }
    if (result.kind === "mfa_required") {
      throw new ServiceUnavailableException(
        "Privileged sign-in is blocked until MFA is implemented",
      );
    }
    return result.credentials;
  }

  async verifyMfa(_request: {
    challengeId: string;
    code: string;
  }): Promise<never> {
    if (!_request.challengeId || !_request.code) {
      throw new UnauthorizedException("MFA challenge is invalid");
    }
    throw new ServiceUnavailableException(
      "MFA is not implemented; no privileged session was issued",
    );
  }

  async refresh(refreshToken: string): Promise<SessionCredentials> {
    const tokenHash = this.signValue(
      refreshToken,
      this.config.get("SESSION_TOKEN_PEPPER", { infer: true }),
    );
    const result = await this.database.transaction<SessionCredentials | null>(
      async (client) => {
        const sessionResult = await client.query<{
          id: string;
          user_id: string;
          expires_at: Date;
          account_status: string;
        }>(
          `SELECT session.id, session.user_id, session.expires_at,
                  user_account.account_status
           FROM auth_sessions AS session
           JOIN users AS user_account ON user_account.id = session.user_id
           WHERE session.refresh_token_hash = $1
             AND session.revoked_at IS NULL
           FOR UPDATE OF session`,
          [tokenHash],
        );
        const session = sessionResult.rows[0];
        if (
          !session ||
          session.expires_at <= new Date() ||
          session.account_status !== "active"
        ) {
          return null;
        }

        const credentials = await this.createSessionCredentials(
          session.user_id,
          session.id,
        );
        await client.query(
          `UPDATE auth_sessions
           SET refresh_token_hash = $1,
               expires_at = CURRENT_TIMESTAMP + ($2 * INTERVAL '1 second')
           WHERE id = $3`,
          [
            this.signValue(
              credentials.refreshToken,
              this.config.get("SESSION_TOKEN_PEPPER", { infer: true }),
            ),
            this.config.get("REFRESH_TOKEN_TTL_SECONDS", { infer: true }),
            session.id,
          ],
        );
        return credentials;
      },
    );
    if (!result) {
      throw new UnauthorizedException("Refresh token is invalid or expired");
    }
    return result;
  }

  async logout(user: AuthenticatedUser, refreshToken: string): Promise<void> {
    const tokenHash = this.signValue(
      refreshToken,
      this.config.get("SESSION_TOKEN_PEPPER", { infer: true }),
    );
    const result = await this.database.query(
      `UPDATE auth_sessions
       SET revoked_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND user_id = $2
         AND refresh_token_hash = $3
         AND revoked_at IS NULL
       RETURNING id`,
      [user.sessionId, user.userId, tokenHash],
    );
    if (result.rowCount !== 1) {
      throw new UnauthorizedException("Refresh token is invalid or revoked");
    }
  }

  private async resolveVerifiedUser(
    client: PoolClient,
    challenge: ChallengeRow,
  ): Promise<string> {
    if (challenge.user_id) {
      const user = await client.query<{ account_status: string }>(
        `SELECT account_status FROM users WHERE id = $1 FOR UPDATE`,
        [challenge.user_id],
      );
      const status = user.rows[0]?.account_status;
      if (status === "pending_verification") {
        await client.query(
          `UPDATE users SET account_status = 'active',
                            updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [challenge.user_id],
        );
      } else if (status !== "active") {
        throw new UnauthorizedException("Account is not eligible to sign in");
      }
      await client.query(
        `UPDATE user_identifiers
         SET verified_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND channel = $2 AND normalized_value = $3`,
        [challenge.user_id, challenge.channel, challenge.identifier_value],
      );
      return challenge.user_id;
    }

    const proposedUserId = randomUUID();
    await client.query(
      `INSERT INTO users (id, account_status, current_mode)
       VALUES ($1, 'active', 'customer')`,
      [proposedUserId],
    );
    const identifier = await client.query<{ user_id: string }>(
      `INSERT INTO user_identifiers
         (id, user_id, channel, normalized_value, verified_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (channel, normalized_value) DO NOTHING
       RETURNING user_id`,
      [
        randomUUID(),
        proposedUserId,
        challenge.channel,
        challenge.identifier_value,
      ],
    );
    let userId = identifier.rows[0]?.user_id;
    if (!userId) {
      await client.query(`DELETE FROM users WHERE id = $1`, [proposedUserId]);
      const existing = await client.query<{ user_id: string }>(
        `SELECT user_id
         FROM user_identifiers
         WHERE channel = $1 AND normalized_value = $2
         FOR UPDATE`,
        [challenge.channel, challenge.identifier_value],
      );
      userId = existing.rows[0]?.user_id;
      if (!userId) {
        throw new ConflictException(
          "Account identifier changed during verification",
        );
      }
    } else {
      await client.query(
        `INSERT INTO user_role_assignments
           (id, user_id, role_code, grant_reason)
         VALUES ($1, $2, 'CUSTOMER', 'Initial verified sign-up')`,
        [randomUUID(), userId],
      );
    }
    await client.query(
      `UPDATE auth_challenges SET user_id = $1 WHERE id = $2`,
      [userId, challenge.id],
    );
    return userId;
  }

  private async createSession(
    client: PoolClient,
    userId: string,
  ): Promise<SessionCredentials> {
    const sessionId = randomUUID();
    const refreshToken = randomBytes(32).toString("base64url");
    await client.query(
      `INSERT INTO auth_sessions
         (id, user_id, refresh_token_hash, expires_at)
       VALUES
         ($1, $2, $3,
          CURRENT_TIMESTAMP + ($4 * INTERVAL '1 second'))`,
      [
        sessionId,
        userId,
        this.signValue(
          refreshToken,
          this.config.get("SESSION_TOKEN_PEPPER", { infer: true }),
        ),
        this.config.get("REFRESH_TOKEN_TTL_SECONDS", { infer: true }),
      ],
    );
    return this.createSessionCredentials(userId, sessionId, refreshToken);
  }

  private async createSessionCredentials(
    userId: string,
    sessionId: string,
    refreshToken = randomBytes(32).toString("base64url"),
  ): Promise<SessionCredentials> {
    const expiresAt = new Date(
      Date.now() +
        this.config.get("ACCESS_TOKEN_TTL_SECONDS", { infer: true }) * 1000,
    );
    const accessToken = await this.jwt.signAsync(
      { sub: userId, sid: sessionId },
      {
        issuer: this.config.get("JWT_ISSUER", { infer: true }),
        expiresIn: this.config.get("ACCESS_TOKEN_TTL_SECONDS", { infer: true }),
      },
    );
    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: expiresAt.toISOString(),
    };
  }

  private normalizeIdentifier(
    channel: "phone" | "email",
    identifier: string,
  ): string {
    const trimmed = identifier.trim();
    return channel === "email" ? trimmed.toLowerCase() : trimmed;
  }

  private signValue(value: string, secret: string): string {
    return createHmac("sha256", secret).update(value).digest("hex");
  }

  private matchesHash(expected: string, actual: string): boolean {
    const expectedBuffer = Buffer.from(expected, "hex");
    const actualBuffer = Buffer.from(actual, "hex");
    return (
      expectedBuffer.length === actualBuffer.length &&
      timingSafeEqual(expectedBuffer, actualBuffer)
    );
  }
}
