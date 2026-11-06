import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UseGuards,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ApiBearerAuth, ApiForbiddenResponse } from "@nestjs/swagger";
import { Request } from "express";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";

export const REQUIRED_PERMISSION = "rbac:required-permission";

/**
 * Deny by default (F-ADM-04): the caller must hold a role that has this
 * permission. Roles are read on every request, so a revoked role stops working
 * immediately. Applies the access-token guard too, so use it alone.
 */
export const RequirePermission = (permission: string) =>
  applyDecorators(
    SetMetadata(REQUIRED_PERMISSION, permission),
    UseGuards(AccessTokenGuard, PermissionGuard),
    ApiBearerAuth(),
    ApiForbiddenResponse({
      description: `Requires the ${permission} permission.`,
    }),
  );

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRED_PERMISSION,
      [context.getHandler(), context.getClass()],
    );
    const user = context
      .switchToHttp()
      .getRequest<
        Request & { authenticatedUser?: AuthenticatedUser }
      >().authenticatedUser;
    // A route that forgot to name a permission, or has no signed-in user, is closed.
    if (!permission || !user) {
      throw new ForbiddenException("Permission denied");
    }

    const granted = await this.database.query(
      `SELECT 1
       FROM user_role_assignments AS assignment
       JOIN role_permissions AS grant_row
         ON grant_row.role_code = assignment.role_code
       WHERE assignment.user_id = $1
         AND assignment.revoked_at IS NULL
         AND grant_row.permission_code = $2
       LIMIT 1`,
      [user.userId, permission],
    );
    if (granted.rowCount !== 1) {
      throw new ForbiddenException("Permission denied");
    }
    return true;
  }
}
