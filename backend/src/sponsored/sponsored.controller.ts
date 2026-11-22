import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { AuthenticatedUser, CurrentUser } from "../auth/authenticated-user.decorator";
import { RequirePermission } from "../rbac/permission.guard";
import { CreateCampaignDto, SetCampaignStatusDto } from "./dto/sponsored.dto";
import { SponsoredService } from "./sponsored.service";

@Controller("vendors/:vendorId/sponsored-campaigns")
@UseGuards(AccessTokenGuard)
@ApiBearerAuth()
@ApiTags("Sponsored campaigns")
export class VendorSponsoredController {
  constructor(private readonly sponsored: SponsoredService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param("vendorId", ParseUUIDPipe) vendorId: string) {
    return this.sponsored.listOwn(user, vendorId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Param("vendorId", ParseUUIDPipe) vendorId: string,
    @Body() body: CreateCampaignDto) { return this.sponsored.create(user, vendorId, body); }

  @Patch(":campaignId/status")
  status(@CurrentUser() user: AuthenticatedUser, @Param("vendorId", ParseUUIDPipe) vendorId: string,
    @Param("campaignId", ParseUUIDPipe) campaignId: string, @Body() body: SetCampaignStatusDto) {
    return this.sponsored.vendorStatus(user, vendorId, campaignId, body);
  }
}

@Controller("admin/sponsored-campaigns")
@ApiTags("Admin: sponsored campaigns")
export class AdminSponsoredController {
  constructor(private readonly sponsored: SponsoredService) {}

  @Get() @RequirePermission("sponsored.review")
  list() { return this.sponsored.adminList(); }

  @Patch(":campaignId/status") @RequirePermission("sponsored.review")
  status(@CurrentUser() user: AuthenticatedUser, @Param("campaignId", ParseUUIDPipe) campaignId: string,
    @Body() body: SetCampaignStatusDto) { return this.sponsored.adminStatus(user, campaignId, body); }
}
