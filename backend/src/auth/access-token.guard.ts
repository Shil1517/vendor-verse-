import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { DatabaseService } from "../database/database.service";
import { AuthenticatedUser } from "./authenticated-user.decorator";

interface AccessTokenPayload {
  sub: string;
  sid: string;
}

type AuthenticatedRequest = Request & { authenticatedUser: AuthenticatedUser };

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Bearer access token is required");
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(
        authorization.slice("Bearer ".length),
        {
          algorithms: ["HS256"],
          issuer: this.config.getOrThrow<string>("JWT_ISSUER"),
          secret: this.config.getOrThrow<string>("JWT_SECRET"),
        },
      );
    } catch {
      throw new UnauthorizedException("Access token is invalid or expired");
    }

    if (!payload.sub || !payload.sid) {
      throw new UnauthorizedException("Access token is invalid or expired");
    }

    const session = await this.database.query(
      `SELECT 1
       FROM auth_sessions AS session
       JOIN users AS user_account ON user_account.id = session.user_id
       WHERE session.id = $1
         AND session.user_id = $2
         AND session.revoked_at IS NULL
         AND session.expires_at > CURRENT_TIMESTAMP
         AND user_account.account_status = 'active'`,
      [payload.sid, payload.sub],
    );
    if (session.rowCount !== 1) {
      throw new UnauthorizedException(
        "Session is invalid, expired, or revoked",
      );
    }

    request.authenticatedUser = {
      userId: payload.sub,
      sessionId: payload.sid,
    };
    return true;
  }
}
