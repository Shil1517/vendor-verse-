import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AccessTokenGuard } from "../auth/access-token.guard";
import {
  AuthenticatedUser,
  CurrentUser,
} from "../auth/authenticated-user.decorator";
import { WaitlistService } from "./waitlist.service";

@Controller()
@UseGuards(AccessTokenGuard)
@ApiTags("Geography")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Access token is invalid or expired." })
export class WaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  @Get("me/waitlist")
  @ApiOperation({ summary: "Cities the caller is waiting for (F-GEO-02)" })
  @ApiOkResponse({ description: "Active waitlist entries, oldest first." })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { entries: await this.waitlist.list(user) };
  }

  @Post("geo/cities/:cityId/waitlist")
  @ApiOperation({ summary: "Join the waitlist for a city that is not live" })
  @ApiCreatedResponse({ description: "The waitlist entry." })
  @ApiBadRequestResponse({ description: "The city is already live." })
  @ApiNotFoundResponse({ description: "No such city." })
  @ApiConflictResponse({ description: "Already on the waitlist." })
  join(
    @CurrentUser() user: AuthenticatedUser,
    @Param("cityId", ParseUUIDPipe) cityId: string,
  ) {
    return this.waitlist.join(user, cityId);
  }

  @Delete("geo/cities/:cityId/waitlist")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Leave a city's waitlist" })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: "Not on the waitlist for this city." })
  leave(
    @CurrentUser() user: AuthenticatedUser,
    @Param("cityId", ParseUUIDPipe) cityId: string,
  ) {
    return this.waitlist.leave(user, cityId);
  }
}
