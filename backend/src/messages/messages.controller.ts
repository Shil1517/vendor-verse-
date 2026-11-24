import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { AuthenticatedUser, CurrentUser } from "../auth/authenticated-user.decorator";
import { ContactConsentDto, StartConversationDto, SendMessageDto } from "./dto/message.dto";
import { MessagesService } from "./messages.service";

@Controller("conversations")
@UseGuards(AccessTokenGuard)
@ApiTags("Messages")
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Post()
  start(@CurrentUser() user: AuthenticatedUser, @Body() body: StartConversationDto) {
    return this.messages.start(user, body);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.messages.list(user);
  }

  @Get(":conversationId")
  get(@CurrentUser() user: AuthenticatedUser, @Param("conversationId", ParseUUIDPipe) id: string) {
    return this.messages.get(user, id);
  }

  @Post(":conversationId/messages")
  send(@CurrentUser() user: AuthenticatedUser, @Param("conversationId", ParseUUIDPipe) id: string, @Body() body: SendMessageDto) {
    return this.messages.send(user, id, body);
  }

  @Get(":conversationId/contact-consents")
  consents(@CurrentUser() user: AuthenticatedUser, @Param("conversationId", ParseUUIDPipe) id: string) {
    return this.messages.consents(user, id);
  }

  @Post(":conversationId/contact-consents")
  grantConsent(@CurrentUser() user: AuthenticatedUser, @Param("conversationId", ParseUUIDPipe) id: string, @Body() body: ContactConsentDto) {
    return this.messages.grantConsent(user, id, body.scope);
  }

  @Delete(":conversationId/contact-consents/:scope")
  revokeConsent(@CurrentUser() user: AuthenticatedUser, @Param("conversationId", ParseUUIDPipe) id: string, @Param("scope") scope: string) {
    return this.messages.revokeConsent(user, id, scope);
  }
}
