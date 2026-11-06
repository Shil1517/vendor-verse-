import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
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
import { ListNotificationsQuery } from "./dto/notifications.dto";
import {
  INBOX_DEFAULT_LIMIT,
  NotificationsService,
} from "./notifications.service";

@Controller("me/notifications")
@UseGuards(AccessTokenGuard)
@ApiTags("Notifications")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Access token is invalid or expired." })
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Notification inbox, newest first (F-MSG-04)" })
  @ApiOkResponse({
    description:
      "Notifications with their deep-link target (linkedResource). Page with `before`.",
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListNotificationsQuery,
  ) {
    return {
      notifications: await this.notifications.list(user, {
        unreadOnly: query.unreadOnly ?? false,
        limit: query.limit ?? INBOX_DEFAULT_LIMIT,
        before: query.before,
      }),
    };
  }

  @Get("unread-count")
  @ApiOperation({ summary: "Number of unread notifications" })
  @ApiOkResponse()
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return { count: await this.notifications.unreadCount(user) };
  }

  @Post("read-all")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark every notification read" })
  @ApiOkResponse({ description: "How many were marked read." })
  async readAll(@CurrentUser() user: AuthenticatedUser) {
    return { updated: await this.notifications.markAllRead(user) };
  }

  @Post(":notificationId/read")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark one notification read" })
  @ApiOkResponse({ description: "The notification." })
  @ApiNotFoundResponse({
    description: "Not one of the caller's notifications.",
  })
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param("notificationId", ParseUUIDPipe) notificationId: string,
  ) {
    return this.notifications.markRead(user, notificationId);
  }
}
