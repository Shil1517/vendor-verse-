import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AccessTokenGuard } from "./access-token.guard";
import { AuthService } from "./auth.service";
import { CurrentUser, AuthenticatedUser } from "./authenticated-user.decorator";
import { LogoutDto } from "./dto/logout.dto";
import { MfaVerificationDto } from "./dto/mfa-verification.dto";
import { OtpRequestDto } from "./dto/otp-request.dto";
import { OtpVerificationDto } from "./dto/otp-verification.dto";
import { RefreshDto } from "./dto/refresh.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("otp/request")
  @HttpCode(HttpStatus.ACCEPTED)
  requestOtp(@Body() request: OtpRequestDto) {
    return this.auth.requestOtp(request);
  }

  @Post("otp/verify")
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() request: OtpVerificationDto) {
    return this.auth.verifyOtp(request);
  }

  @Post("mfa/verify")
  @HttpCode(HttpStatus.OK)
  verifyMfa(@Body() request: MfaVerificationDto) {
    return this.auth.verifyMfa(request);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(@Body() request: RefreshDto) {
    return this.auth.refresh(request.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: LogoutDto,
  ): Promise<void> {
    await this.auth.logout(user, request.refreshToken);
  }
}
