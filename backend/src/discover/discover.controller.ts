import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
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
import { DiscoverService } from "./discover.service";
import { SearchListingsQueryDto } from "./dto/discover.dto";
import { FavoritesService } from "./favorites.service";

@Controller("discover")
@ApiTags("Discover")
export class DiscoverController {
  constructor(private readonly discover: DiscoverService) {}

  @Get("listings")
  @ApiOperation({
    summary: "Search listings (F-DSC-02, F-DSC-04)",
    description:
      "Public. Only eligible listings in a live market are returned, ranked organically (plan tier and sponsorship are not signals). matchedOn explains each match, including a coverage level so a broader-area match is labelled. marketLive false means nothing is publicly searchable there yet. Page with nextCursor.",
  })
  @ApiOkResponse({ description: "A page of matches." })
  @ApiBadRequestResponse({ description: "Invalid query or city not in the country." })
  search(@Query() query: SearchListingsQueryDto) {
    return this.discover.search(query);
  }

  @Get("listings/:listingId")
  @ApiOperation({
    summary: "Listing detail with honest missing-data labels (F-DSC-05, F-DSC-06)",
    description:
      "Public. A price or availability the vendor did not provide is reported as not_provided, never as zero or an estimate.",
  })
  @ApiOkResponse({ description: "The listing." })
  @ApiNotFoundResponse({ description: "No such public listing." })
  getListing(@Param("listingId", ParseUUIDPipe) listingId: string) {
    return this.discover.getListing(listingId);
  }
}

@Controller("me/favorites")
@UseGuards(AccessTokenGuard)
@ApiTags("Discover")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Access token is invalid or expired." })
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: "List saved vendors (F-DSC-07)" })
  @ApiOkResponse({ description: "Newest first." })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { favorites: await this.favorites.list(user) };
  }

  @Put(":vendorId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Save a vendor (idempotent)" })
  @ApiNoContentResponse({ description: "Saved." })
  @ApiNotFoundResponse({ description: "No such public vendor." })
  async add(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
  ): Promise<void> {
    await this.favorites.add(user, vendorId);
  }

  @Delete(":vendorId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a saved vendor (idempotent)" })
  @ApiNoContentResponse({ description: "Removed or was not saved." })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
  ): Promise<void> {
    await this.favorites.remove(user, vendorId);
  }
}
