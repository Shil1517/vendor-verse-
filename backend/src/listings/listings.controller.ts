import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AccessTokenGuard } from "../auth/access-token.guard";
import {
  AuthenticatedUser,
  CurrentUser,
} from "../auth/authenticated-user.decorator";
import { AvailabilityService } from "./availability.service";
import {
  CreateCapacityWindowDto,
  UpsertAvailabilityRuleDto,
} from "./dto/availability.dto";
import { CreateListingDto, UpdateListingDto } from "./dto/listing.dto";
import { ListingsService } from "./listings.service";
import { PublicationGatesService } from "./publication-gates.service";

@Controller()
@UseGuards(AccessTokenGuard)
@ApiTags("Listings")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Access token is invalid or expired." })
@ApiNotFoundResponse({
  description: "No such vendor or listing for this user.",
})
export class ListingsController {
  constructor(
    private readonly listings: ListingsService,
    private readonly availability: AvailabilityService,
    private readonly gates: PublicationGatesService,
  ) {}

  @Post("vendors/:vendorId/listings")
  @ApiOperation({
    summary: "Create a draft listing (F-VND-06)",
    description:
      "The category must be ACTIVE; its current configuration version is pinned to the listing. A draft is never public. Send an Idempotency-Key to make retries safe.",
  })
  @ApiCreatedResponse({ description: "The draft listing." })
  @ApiBadRequestResponse({
    description: "Validation failed or the category is not active.",
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
    @Body() request: CreateListingDto,
  ) {
    return this.listings.create(user, vendorId, request);
  }

  @Get("vendors/:vendorId/listings")
  @ApiOperation({ summary: "List the vendor's listings" })
  @ApiOkResponse({ description: "Newest first." })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
  ) {
    return { listings: await this.listings.listForVendor(user, vendorId) };
  }

  @Get("vendors/:vendorId/publication-gates")
  @ApiOperation({
    summary: "Publication gates, computed live (F-VND-05)",
    description:
      "Six gates, never stored. A gate with met null cannot be evaluated yet (its module is not built) and keeps canPublish false.",
  })
  @ApiQuery({ name: "listingId", required: false })
  @ApiOkResponse({
    description: "The gates and whether the vendor can publish.",
  })
  publicationGates(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
    @Query("listingId", new ParseUUIDPipe({ optional: true }))
    listingId?: string,
  ) {
    return this.gates.compute(user, vendorId, listingId);
  }

  @Get("listings/:listingId")
  @ApiOperation({ summary: "Get one of the caller's listings" })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param("listingId", ParseUUIDPipe) listingId: string,
  ) {
    return this.listings.get(user, listingId);
  }

  @Patch("listings/:listingId")
  @ApiOperation({
    summary: "Edit a listing",
    description:
      "Allowed in draft, changes_requested, approved and paused. Editing an approved listing returns it to pending_review. Omitted fields are unchanged.",
  })
  @ApiBadRequestResponse({
    description: "Validation failed or the price fields are inconsistent.",
  })
  @ApiConflictResponse({
    description: "The listing is not in an editable state.",
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("listingId", ParseUUIDPipe) listingId: string,
    @Body() request: UpdateListingDto,
  ) {
    return this.listings.update(user, listingId, request);
  }

  @Post("listings/:listingId/submit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Submit a draft or changes_requested listing for review",
  })
  @ApiConflictResponse({
    description: "The listing cannot be submitted from its state.",
  })
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param("listingId", ParseUUIDPipe) listingId: string,
  ) {
    return this.listings.transition(user, listingId, "submit");
  }

  @Post("listings/:listingId/pause")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Pause an approved listing" })
  @ApiConflictResponse({
    description: "Only an approved listing can be paused.",
  })
  pause(
    @CurrentUser() user: AuthenticatedUser,
    @Param("listingId", ParseUUIDPipe) listingId: string,
  ) {
    return this.listings.transition(user, listingId, "pause");
  }

  @Post("listings/:listingId/resume")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resume a paused listing" })
  @ApiConflictResponse({ description: "Only a paused listing can be resumed." })
  resume(
    @CurrentUser() user: AuthenticatedUser,
    @Param("listingId", ParseUUIDPipe) listingId: string,
  ) {
    return this.listings.transition(user, listingId, "resume");
  }

  @Post("listings/:listingId/unpublish")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Unpublish a listing" })
  @ApiConflictResponse({
    description: "The listing is already unpublished or rejected.",
  })
  unpublish(
    @CurrentUser() user: AuthenticatedUser,
    @Param("listingId", ParseUUIDPipe) listingId: string,
  ) {
    return this.listings.transition(user, listingId, "unpublish");
  }

  /* ---- availability (F-VND-08) ---- */

  @Get("listings/:listingId/availability")
  @ApiOperation({
    summary: "Availability rule, or null when the vendor provided none",
  })
  async getAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Param("listingId", ParseUUIDPipe) listingId: string,
  ) {
    return { rule: await this.availability.getRule(user, listingId) };
  }

  @Put("listings/:listingId/availability")
  @ApiOperation({
    summary: "Set the weekly availability rule (replaces any existing one)",
  })
  @ApiBadRequestResponse({ description: "The schedule or dates are invalid." })
  setAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Param("listingId", ParseUUIDPipe) listingId: string,
    @Body() request: UpsertAvailabilityRuleDto,
  ) {
    return this.availability.setRule(user, listingId, request);
  }

  @Delete("listings/:listingId/availability")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove the availability rule" })
  @ApiNoContentResponse()
  clearAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Param("listingId", ParseUUIDPipe) listingId: string,
  ) {
    return this.availability.clearRule(user, listingId);
  }

  @Get("listings/:listingId/capacity")
  @ApiOperation({ summary: "Bookable capacity windows" })
  async listCapacity(
    @CurrentUser() user: AuthenticatedUser,
    @Param("listingId", ParseUUIDPipe) listingId: string,
  ) {
    return { windows: await this.availability.listWindows(user, listingId) };
  }

  @Post("listings/:listingId/capacity")
  @ApiOperation({ summary: "Add a capacity window" })
  @ApiCreatedResponse({ description: "The window." })
  @ApiConflictResponse({ description: "It overlaps an existing window." })
  addCapacity(
    @CurrentUser() user: AuthenticatedUser,
    @Param("listingId", ParseUUIDPipe) listingId: string,
    @Body() request: CreateCapacityWindowDto,
  ) {
    return this.availability.addWindow(user, listingId, request);
  }

  @Delete("listings/:listingId/capacity/:windowId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Remove a capacity window that has no reservations",
  })
  @ApiNoContentResponse()
  @ApiConflictResponse({ description: "The window has reservations." })
  removeCapacity(
    @CurrentUser() user: AuthenticatedUser,
    @Param("listingId", ParseUUIDPipe) listingId: string,
    @Param("windowId", ParseUUIDPipe) windowId: string,
  ) {
    return this.availability.removeWindow(user, listingId, windowId);
  }
}
