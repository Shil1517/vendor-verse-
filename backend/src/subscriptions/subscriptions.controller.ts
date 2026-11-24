import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { AuthenticatedUser, CurrentUser } from "../auth/authenticated-user.decorator";
import { RequirePermission } from "../rbac/permission.guard";
import { CreatePlanDto, CreatePlanVersionDto, MonitorSubscriptionsDto, SetPlanStatusDto } from "./dto/subscription.dto";
import { SubscriptionsService } from "./subscriptions.service";

@Controller("plans")
@ApiTags("Plans")
export class PlansController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get()
  list() { return this.subscriptions.publicPlans(); }

  @Get(":planId")
  get(@Param("planId", ParseUUIDPipe) id: string) { return this.subscriptions.publicPlan(id); }
}

@Controller("vendors/:vendorId")
@UseGuards(AccessTokenGuard)
@ApiBearerAuth()
@ApiTags("Subscriptions")
export class VendorSubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get("subscription")
  current(@CurrentUser() user: AuthenticatedUser, @Param("vendorId", ParseUUIDPipe) id: string) {
    return this.subscriptions.vendorSubscription(user, id);
  }

  @Get("lead-usage")
  usage(@CurrentUser() user: AuthenticatedUser, @Param("vendorId", ParseUUIDPipe) id: string) {
    return this.subscriptions.vendorLeadUsage(user, id);
  }
}

@Controller("admin")
@ApiTags("Admin: subscriptions")
export class AdminSubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get("plans") @RequirePermission("plans.manage")
  plans() { return this.subscriptions.adminPlans(); }

  @Post("plans") @RequirePermission("plans.manage")
  create(@CurrentUser() actor: AuthenticatedUser, @Body() body: CreatePlanDto) { return this.subscriptions.createPlan(actor, body); }

  @Post("plans/:planId/versions") @RequirePermission("plans.manage")
  version(@CurrentUser() actor: AuthenticatedUser, @Param("planId", ParseUUIDPipe) id: string, @Body() body: CreatePlanVersionDto) {
    return this.subscriptions.createVersion(actor, id, body);
  }

  @Patch("plans/:planId/status") @RequirePermission("plans.manage")
  status(@CurrentUser() actor: AuthenticatedUser, @Param("planId", ParseUUIDPipe) id: string, @Body() body: SetPlanStatusDto) {
    return this.subscriptions.setStatus(actor, id, body);
  }

  @Get("subscriptions") @RequirePermission("plans.manage")
  monitor(@Query() query: MonitorSubscriptionsDto) { return this.subscriptions.monitor(query); }
}
