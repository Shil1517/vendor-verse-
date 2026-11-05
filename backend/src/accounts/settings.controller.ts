import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
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
import {
  CreateDataRequestDto,
  UpdateNotificationPreferencesDto,
} from "./dto/settings.dto";
import { SettingsService } from "./settings.service";

@Controller("me")
@UseGuards(AccessTokenGuard)
@ApiTags("Account settings")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Access token is invalid or expired." })
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get("sessions")
  @ApiOperation({ summary: "List active sessions and devices (F-ACC-08)" })
  @ApiOkResponse({ description: "Active sessions; the caller's is current." })
  async listSessions(@CurrentUser() user: AuthenticatedUser) {
    return { sessions: await this.settings.listSessions(user) };
  }

  @Delete("sessions/:sessionId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Sign a session out (revoke it)" })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: "No active session with that id." })
  revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param("sessionId", ParseUUIDPipe) sessionId: string,
  ) {
    return this.settings.revokeSession(user, sessionId);
  }

  @Get("notification-preferences")
  @ApiOperation({ summary: "Channel and category preferences (F-ACC-07)" })
  @ApiOkResponse({ description: "Stored preferences; unset means default." })
  async listNotificationPreferences(@CurrentUser() user: AuthenticatedUser) {
    return {
      preferences: await this.settings.listNotificationPreferences(user),
    };
  }

  @Put("notification-preferences")
  @ApiOperation({
    summary: "Set channel and category preferences",
    description:
      "Upserts the listed entries. Mandatory transactional notices are not controlled by these preferences; the dispatcher always sends them.",
  })
  @ApiOkResponse({ description: "All stored preferences after the update." })
  async updateNotificationPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: UpdateNotificationPreferencesDto,
  ) {
    return {
      preferences: await this.settings.updateNotificationPreferences(
        user,
        request.preferences,
      ),
    };
  }

  @Get("data-requests")
  @ApiOperation({ summary: "Export and deletion requests with status" })
  @ApiOkResponse({ description: "The user's requests, newest first." })
  async listDataRequests(@CurrentUser() user: AuthenticatedUser) {
    return { requests: await this.settings.listDataRequests(user) };
  }

  @Post("data-requests")
  @ApiOperation({
    summary: "Request a data export or account deletion (F-ACC-04, F-ACC-05)",
    description:
      "Records the request only. Requester verification, fulfilment and retention rules are not implemented (CFG-08 is open); the account stays active.",
  })
  @ApiCreatedResponse({ description: "The recorded request." })
  @ApiConflictResponse({ description: "A request of that type is open." })
  createDataRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: CreateDataRequestDto,
  ) {
    return this.settings.createDataRequest(user, request);
  }

  @Post("data-requests/:requestId/cancel")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cancel a request that is not yet in progress" })
  @ApiOkResponse({ description: "The cancelled request." })
  @ApiNotFoundResponse({ description: "No cancellable request with that id." })
  cancelDataRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param("requestId", ParseUUIDPipe) requestId: string,
  ) {
    return this.settings.cancelDataRequest(user, requestId);
  }
}
