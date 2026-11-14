import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  AuthenticatedUser,
  CurrentUser,
} from "../auth/authenticated-user.decorator";
import { UniversalSearchQueryDto } from "./dto/search.dto";
import { OptionalAccessTokenGuard } from "./optional-access-token.guard";
import { SearchService } from "./search.service";

@Controller("search")
@UseGuards(OptionalAccessTokenGuard)
@ApiTags("Search")
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @ApiOperation({
    summary: "Universal search (F-DSC-02, D-025)",
    description:
      "Public without a token: vendors, products, services and categories in a live market, with the same eligibility and organic ranking as /discover/listings. With a token it also searches the caller's own RFQs, bookings, contracts and purchase orders; a record appears only to a party to it. Several types return a short page per section; request one type and pass its nextCursor to page it.",
  })
  @ApiOkResponse({ description: "Results grouped by type." })
  @ApiBadRequestResponse({ description: "Invalid query." })
  @ApiUnauthorizedResponse({
    description: "Bad token, or a private type asked for without one.",
  })
  query(
    @Query() query: UniversalSearchQueryDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.search.search(query, user);
  }
}
