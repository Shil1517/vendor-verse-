import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  AuthenticatedUser,
  CurrentUser,
} from "../auth/authenticated-user.decorator";
import { FilesService } from "../files/files.service";
import { RequirePermission } from "../rbac/permission.guard";
import {
  DuplicateReviewDecisionDto,
  ListDuplicateQueueQuery,
  ListingMediaReviewDecisionDto,
  ListingReviewDecisionDto,
  ListListingReviewQueueQuery,
  ListProfileImageQueueQuery,
  ProfileImageReviewDecisionDto,
} from "./dto/listing-review.dto";
import type { ProfileImageType } from "./dto/listing-review.dto";
import { ListingReviewService } from "./listing-review.service";

enum ProfileImageTypeParam {
  LOGO = "logo",
  BANNER = "banner",
}

@Controller("admin")
@ApiTags("Admin: listing review")
@ApiBearerAuth()
export class AdminListingReviewController {
  constructor(
    private readonly reviews: ListingReviewService,
    private readonly files: FilesService,
  ) {}

  @Get("listings")
  @RequirePermission("listing.review")
  @ApiOperation({
    summary: "List submitted listings awaiting content review (F-VND-07)",
    description:
      "Includes listing text, attributes, photos, portfolio media and pending duplicate flags. Results are oldest first.",
  })
  @ApiOkResponse({ description: "A page of listings pending review." })
  listListings(@Query() query: ListListingReviewQueueQuery) {
    return this.reviews.listReviewQueue({
      limit: query.limit ?? 50,
      cursor: query.cursor,
    });
  }

  @Post("listings/:listingId/decision")
  @RequirePermission("listing.review")
  @ApiOperation({
    summary: "Approve, request changes to, or reject a listing",
    description:
      "A reason is required and audited. Review all pending listing media before approving. Reviewers cannot decide their own vendor's listing.",
  })
  @ApiOkResponse({ description: "The recorded listing review." })
  @ApiConflictResponse({
    description: "The listing is not pending review or has unreviewed media.",
  })
  @ApiNotFoundResponse({ description: "No such listing." })
  decideListing(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("listingId", ParseUUIDPipe) listingId: string,
    @Body() request: ListingReviewDecisionDto,
  ) {
    return this.reviews.review(
      actor,
      listingId,
      request.status,
      request.reason,
    );
  }

  @Post("listings/:listingId/media/:mediaId/decision")
  @RequirePermission("listing.review")
  @ApiOperation({
    summary: "Approve or reject listing photo/portfolio media",
    description: "The reason is audited. Rejected media is never auto-deleted.",
  })
  @ApiOkResponse({ description: "The recorded media review." })
  @ApiConflictResponse({ description: "This media was already reviewed." })
  @ApiNotFoundResponse({ description: "No such media for this listing." })
  decideMedia(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("listingId", ParseUUIDPipe) listingId: string,
    @Param("mediaId", ParseUUIDPipe) mediaId: string,
    @Body() request: ListingMediaReviewDecisionDto,
  ) {
    return this.reviews.reviewMedia(
      actor,
      listingId,
      mediaId,
      request.status,
      request.reason,
    );
  }

  @Get("listings/:listingId/media/:mediaId/download-url")
  @RequirePermission("listing.review")
  @ApiOperation({
    summary: "Get a short-lived URL for listing media under review",
  })
  @ApiOkResponse({ description: "The private file download URL." })
  @ApiNotFoundResponse({ description: "No clean media file for this listing." })
  downloadListingMedia(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("listingId", ParseUUIDPipe) listingId: string,
    @Param("mediaId", ParseUUIDPipe) mediaId: string,
  ) {
    return this.files.reviewListingMediaDownloadUrl(actor, listingId, mediaId);
  }

  @Get("listing-duplicates")
  @RequirePermission("listing.review")
  @ApiOperation({
    summary: "List possible duplicate listings for human review (F-VND-07)",
    description:
      "The matcher uses same vendor owner, category and listing type, normalized title and an exactly matching declared service area. It does not merge or delete listings.",
  })
  @ApiOkResponse({ description: "A page of pending duplicate flags." })
  listDuplicates(@Query() query: ListDuplicateQueueQuery) {
    return this.reviews.listDuplicateQueue({
      limit: query.limit ?? 50,
      cursor: query.cursor,
    });
  }

  @Post("listing-duplicates/:flagId/decision")
  @RequirePermission("listing.review")
  @ApiOperation({
    summary: "Mark a possible duplicate confirmed or not a duplicate",
    description:
      "The reason is required and audited; listings are never merged or deleted.",
  })
  @ApiOkResponse({ description: "The recorded duplicate review." })
  @ApiConflictResponse({
    description: "This duplicate flag was already reviewed.",
  })
  @ApiNotFoundResponse({ description: "No such duplicate flag." })
  decideDuplicate(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("flagId", ParseUUIDPipe) flagId: string,
    @Body() request: DuplicateReviewDecisionDto,
  ) {
    return this.reviews.reviewDuplicate(
      actor,
      flagId,
      request.status,
      request.reason,
    );
  }

  @Get("vendor-profile-images")
  @RequirePermission("listing.review")
  @ApiOperation({
    summary: "List unreviewed vendor logos and banners (F-VND-07)",
    description:
      "Only images currently referenced by a vendor profile are included. Results are oldest first.",
  })
  @ApiOkResponse({ description: "A page of profile images pending review." })
  listProfileImages(@Query() query: ListProfileImageQueueQuery) {
    return this.reviews.listProfileImageQueue({
      limit: query.limit ?? 50,
      cursor: query.cursor,
    });
  }

  @Post("vendors/:vendorId/profile-images/decision")
  @RequirePermission("listing.review")
  @ApiOperation({
    summary: "Approve or reject a vendor logo or banner",
    description:
      "The image must still be referenced by the profile. The reason is required and audited.",
  })
  @ApiOkResponse({ description: "The recorded profile image review." })
  @ApiConflictResponse({
    description: "This profile image was already reviewed.",
  })
  @ApiNotFoundResponse({ description: "No such current vendor profile image." })
  decideProfileImage(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
    @Body() request: ProfileImageReviewDecisionDto,
  ) {
    return this.reviews.reviewProfileImage(
      actor,
      vendorId,
      request.imageType,
      request.fileId,
      request.status,
      request.reason,
    );
  }

  @Get("vendors/:vendorId/profile-images/:imageType/:fileId/download-url")
  @RequirePermission("listing.review")
  @ApiOperation({
    summary: "Get a short-lived URL for a profile image under review",
  })
  @ApiOkResponse({ description: "The private file download URL." })
  @ApiNotFoundResponse({ description: "No clean current profile image." })
  downloadProfileImage(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
    @Param("imageType", new ParseEnumPipe(ProfileImageTypeParam))
    imageType: ProfileImageType,
    @Param("fileId", ParseUUIDPipe) fileId: string,
  ) {
    return this.files.reviewVendorProfileImageDownloadUrl(
      actor,
      vendorId,
      imageType,
      fileId,
    );
  }
}
