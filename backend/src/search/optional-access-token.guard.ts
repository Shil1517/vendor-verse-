import { ExecutionContext, Injectable } from "@nestjs/common";
import { Request } from "express";
import { AccessTokenGuard } from "../auth/access-token.guard";

/**
 * For routes that are public but return more to a signed-in caller (F-DSC-02,
 * D-025). No Authorization header means an anonymous caller. A header that is
 * present must be valid: a bad or expired token is a 401, never silently
 * downgraded, so a client learns its session ended.
 */
@Injectable()
export class OptionalAccessTokenGuard extends AccessTokenGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.headers.authorization) {
      return true;
    }
    return super.canActivate(context);
  }
}
