import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
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
import { AccountsService } from "./accounts.service";
import { ModeSwitchDto } from "./dto/mode-switch.dto";

@Controller("me")
@UseGuards(AccessTokenGuard)
@ApiTags("Account")
@ApiBearerAuth()
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  @ApiOperation({ summary: "Get the authenticated account context" })
  @ApiOkResponse({
    schema: {
      example: {
        userId: "2e7c2d89-4d25-496d-a643-2a7d95ca9db0",
        currentMode: "CUSTOMER",
        availableModes: ["CUSTOMER"],
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: "Access token is invalid or expired.",
  })
  getCurrentContext(@CurrentUser() user: AuthenticatedUser) {
    return this.accounts.getCurrentContext(user);
  }

  @Post("mode")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Switch the active account mode" })
  @ApiOkResponse({
    schema: {
      example: {
        userId: "2e7c2d89-4d25-496d-a643-2a7d95ca9db0",
        currentMode: "CUSTOMER",
        availableModes: ["CUSTOMER"],
      },
    },
  })
  @ApiConflictResponse({ description: "Requested mode is unavailable." })
  @ApiUnauthorizedResponse({
    description: "Access token is invalid or expired.",
  })
  switchMode(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: ModeSwitchDto,
  ) {
    return this.accounts.switchMode(user, request);
  }
}
