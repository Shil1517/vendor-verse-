import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  AuthenticatedUser,
  CurrentUser,
} from "../auth/authenticated-user.decorator";
import {
  ASSIGNABLE_ROLES,
  AssignableRole,
  GrantRoleDto,
  RevokeRoleDto,
} from "./dto/role-change.dto";
import { RequirePermission } from "./permission.guard";
import { RbacService } from "./rbac.service";

enum AssignableRoleParam {
  SALES_AGENT = "SALES_AGENT",
  SUPER_ADMIN = "SUPER_ADMIN",
}

@Controller("admin")
@ApiTags("Admin: roles and permissions")
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get("roles")
  @RequirePermission("rbac.read")
  @ApiOperation({
    summary: "List the four roles and their permissions (F-ADM-04)",
  })
  @ApiOkResponse({ description: "Every role with its permission codes." })
  async listRoles() {
    return { roles: await this.rbac.listRoles() };
  }

  @Get("users/:userId/roles")
  @RequirePermission("rbac.read")
  @ApiOperation({ summary: "A user's active role assignments" })
  @ApiOkResponse({ description: "The user's active assignments." })
  @ApiNotFoundResponse({ description: "No such user." })
  listUserRoles(@Param("userId", ParseUUIDPipe) userId: string) {
    return this.rbac.listUserRoles(userId);
  }

  @Post("users/:userId/roles")
  @RequirePermission("rbac.manage")
  @ApiOperation({
    summary: "Grant SALES_AGENT or SUPER_ADMIN",
    description: `Assignable roles: ${ASSIGNABLE_ROLES.join(", ")}. A reason is required and audited. You cannot change your own roles. CUSTOMER and VENDOR are system-managed.`,
  })
  @ApiCreatedResponse({ description: "The new assignment." })
  @ApiNotFoundResponse({ description: "No such user." })
  @ApiConflictResponse({ description: "The user already holds this role." })
  grant(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("userId", ParseUUIDPipe) userId: string,
    @Body() request: GrantRoleDto,
  ) {
    return this.rbac.grant(actor, userId, request.roleCode, request.reason);
  }

  @Delete("users/:userId/roles/:roleCode")
  @RequirePermission("rbac.manage")
  @ApiOperation({
    summary: "Revoke SALES_AGENT or SUPER_ADMIN",
    description:
      "A reason is required in the body and audited. You cannot change your own roles, and the last Super Admin cannot be revoked.",
  })
  @ApiOkResponse({ description: "The role was revoked." })
  @ApiNotFoundResponse({
    description: "No such user, or the role is not held.",
  })
  @ApiConflictResponse({ description: "This is the last Super Admin." })
  revoke(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("userId", ParseUUIDPipe) userId: string,
    @Param("roleCode", new ParseEnumPipe(AssignableRoleParam))
    roleCode: AssignableRole,
    @Body() request: RevokeRoleDto,
  ) {
    return this.rbac.revoke(actor, userId, roleCode, request.reason);
  }
}
