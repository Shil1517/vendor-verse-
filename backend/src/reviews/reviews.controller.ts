import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { AuthenticatedUser, CurrentUser } from "../auth/authenticated-user.decorator";
import { CreateReviewDto, RespondToReviewDto } from "./dto/review.dto";
import { ReviewsService } from "./reviews.service";

@Controller("reviews")
@UseGuards(AccessTokenGuard)
@ApiBearerAuth()
@ApiTags("Reviews")
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateReviewDto) {
    return this.reviews.create(user, body);
  }

  @Get("mine")
  mine(@CurrentUser() user: AuthenticatedUser) { return this.reviews.mine(user); }

  @Post(":reviewId/response")
  respond(@CurrentUser() user: AuthenticatedUser, @Param("reviewId", ParseUUIDPipe) id: string, @Body() body: RespondToReviewDto) {
    return this.reviews.respond(user, id, body.response);
  }
}

@Controller("vendors/:vendorId/reviews")
@ApiTags("Reviews")
export class PublicVendorReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(@Param("vendorId", ParseUUIDPipe) vendorId: string, @Query("limit") limit?: string) {
    return this.reviews.publicList(vendorId, limit);
  }
}
