import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AccessTokenGuard } from "../auth/access-token.guard";
import {
  AuthenticatedUser,
  CurrentUser,
} from "../auth/authenticated-user.decorator";
import { RequirePermission } from "../rbac/permission.guard";
import {
  AddVendorRoleDto,
  CreateRoleDefinitionDto,
  ListRoleDefinitionsQuery,
  ListRoleReviewQuery,
  RoleDecisionDto,
  UpdateRoleDefinitionDto,
} from "./dto/vendor-role.dto";
import { VendorRolesService } from "./vendor-roles.service";

@Controller("vendor-roles")
@ApiTags("Vendor roles")
export class VendorRoleCatalogueController {
  constructor(private readonly roles: VendorRolesService) {}

  @Get()
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: "Access token is invalid or expired.",
  })
  @ApiOperation({
    summary: "List the vendor roles a vendor can pick (D-024)",
    description:
      "Each role carries the documents it requires. A vendor submits the combined set for its roles. Retired roles are hidden here.",
  })
  @ApiOkResponse({ description: "Active role definitions." })
  async list() {
    return { roles: await this.roles.listDefinitions(false) };
  }
}

@Controller("admin/vendor-roles")
@ApiTags("Admin: vendor roles")
export class AdminVendorRoleDefinitionsController {
  constructor(private readonly roles: VendorRolesService) {}

  @Get()
  @RequirePermission("vendor_roles.manage")
  @ApiOperation({ summary: "List role definitions, optionally with retired" })
  @ApiOkResponse({ description: "Role definitions." })
  async list(@Query() query: ListRoleDefinitionsQuery) {
    return {
      roles: await this.roles.listDefinitions(query.includeRetired ?? true),
    };
  }

  @Post()
  @RequirePermission("vendor_roles.manage")
  @ApiOperation({
    summary: "Create a vendor role",
    description:
      "Adding a new kind of vendor is a configuration change, not a code change (D-024).",
  })
  @ApiCreatedResponse({ description: "The new role definition." })
  @ApiBadRequestResponse({ description: "A field failed validation." })
  @ApiConflictResponse({ description: "That role code already exists." })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() request: CreateRoleDefinitionDto,
  ) {
    return this.roles.createDefinition(actor, request);
  }

  @Patch(":code")
  @RequirePermission("vendor_roles.manage")
  @ApiOperation({
    summary: "Edit or retire a vendor role",
    description:
      "isActive false retires the role: new vendors cannot pick it, vendors that hold it keep it.",
  })
  @ApiOkResponse({ description: "The updated role definition." })
  @ApiNotFoundResponse({ description: "No such vendor role." })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("code") code: string,
    @Body() request: UpdateRoleDefinitionDto,
  ) {
    return this.roles.updateDefinition(actor, code, request);
  }
}

@Controller("vendors/:vendorId/roles")
@UseGuards(AccessTokenGuard)
@ApiTags("Vendors")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Access token is invalid or expired." })
@ApiNotFoundResponse({ description: "No such vendor for this user." })
export class VendorRolesController {
  constructor(private readonly roles: VendorRolesService) {}

  @Get()
  @ApiOperation({ summary: "List the caller's vendor roles and their status" })
  @ApiOkResponse({
    description:
      "Roles with status pending, verified, rejected or revoked. Only verified roles are public.",
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
  ) {
    return { roles: await this.roles.listForVendor(user, vendorId) };
  }

  @Post()
  @ApiOperation({
    summary: "Add a role to the vendor",
    description:
      "The role starts as pending and stays hidden publicly until a reviewer verifies it (D-020, D-021). A rejected or revoked role is resubmitted.",
  })
  @ApiCreatedResponse({ description: "The vendor roles." })
  @ApiBadRequestResponse({ description: "The role is unknown or retired." })
  @ApiConflictResponse({ description: "The vendor already holds this role." })
  async add(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
    @Body() request: AddVendorRoleDto,
  ) {
    return {
      roles: await this.roles.addRole(user, vendorId, request.roleCode),
    };
  }

  @Delete(":roleCode")
  @ApiOperation({
    summary: "Remove a role from the vendor",
    description: "A vendor always keeps at least one role.",
  })
  @ApiOkResponse({ description: "The remaining vendor roles." })
  @ApiBadRequestResponse({
    description: "The vendor must keep at least one role.",
  })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
    @Param("roleCode") roleCode: string,
  ) {
    return {
      roles: await this.roles.removeRole(user, vendorId, roleCode),
    };
  }
}

@Controller("admin/vendor-role-reviews")
@ApiTags("Admin: vendor roles")
export class AdminVendorRoleReviewController {
  constructor(private readonly roles: VendorRolesService) {}

  @Get()
  @RequirePermission("verification.review")
  @ApiOperation({ summary: "Review queue for vendor roles (D-020)" })
  @ApiOkResponse({ description: "Roles waiting for review, oldest first." })
  list(@Query() query: ListRoleReviewQuery) {
    return this.roles.listReviewQueue({
      status: query.status,
      limit: query.limit ?? 50,
    });
  }

  @Post(":vendorId/:roleCode/decision")
  @RequirePermission("verification.review")
  @ApiOperation({
    summary: "Verify, reject or revoke one role of a vendor",
    description:
      "A reason is required and audited. Reviewers cannot decide on their own vendor role. A pending role can be verified or rejected; a verified role can be revoked.",
  })
  @ApiOkResponse({ description: "The updated role." })
  @ApiConflictResponse({
    description: "The decision is not allowed from the current status.",
  })
  decide(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
    @Param("roleCode") roleCode: string,
    @Body() request: RoleDecisionDto,
  ) {
    return this.roles.decide(
      actor,
      vendorId,
      roleCode,
      request.decision,
      request.reason,
    );
  }
}
