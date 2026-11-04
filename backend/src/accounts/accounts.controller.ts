import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import {
  AuthenticatedUser,
  CurrentUser,
} from "../auth/authenticated-user.decorator";
import { AccountsService } from "./accounts.service";
import { ModeSwitchDto } from "./dto/mode-switch.dto";

@Controller("me")
@UseGuards(AccessTokenGuard)
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  getCurrentContext(@CurrentUser() user: AuthenticatedUser) {
    return this.accounts.getCurrentContext(user);
  }

  @Post("mode")
  @HttpCode(HttpStatus.OK)
  switchMode(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: ModeSwitchDto,
  ) {
    return this.accounts.switchMode(user, request);
  }
}
