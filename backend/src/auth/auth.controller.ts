import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AccessTokenGuard } from "./access-token.guard";
import { AuthService } from "./auth.service";
import { CurrentUser, AuthenticatedUser } from "./authenticated-user.decorator";
import { LogoutDto } from "./dto/logout.dto";
import { MfaVerificationDto } from "./dto/mfa-verification.dto";
import { OtpRequestDto } from "./dto/otp-request.dto";
import { OtpVerificationDto } from "./dto/otp-verification.dto";
import { RefreshDto } from "./dto/refresh.dto";

@Controller("auth")
@ApiTags("Authentication")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("otp/request")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Request a sign-up or login OTP" })
  @ApiAcceptedResponse({
    schema: {
      example: {
        challengeId: "a7a03a7d-5616-4d24-a8a3-bdc360da3372",
        expiresAt: "2026-11-05T04:00:00.000Z",
      },
    },
  })
  @ApiTooManyRequestsResponse({ description: "OTP request limit exceeded." })
  requestOtp(@Body() request: OtpRequestDto) {
    return this.auth.requestOtp(request);
  }

  @Post("otp/verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify an OTP and create a session" })
  @ApiOkResponse({
    schema: {
      example: {
        accessToken: "eyJ...signed-access-token",
        refreshToken: "opaque-refresh-token",
        accessTokenExpiresAt: "2026-11-05T04:15:00.000Z",
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: "OTP challenge is invalid or expired.",
  })
  @ApiTooManyRequestsResponse({
    description: "OTP verification limit exceeded.",
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: "Privileged sign-in is blocked until MFA is implemented.",
  })
  verifyOtp(@Body() request: OtpVerificationDto) {
    return this.auth.verifyOtp(request);
  }

  @Post("mfa/verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify a privileged-account MFA challenge" })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: "MFA is not implemented; no privileged session is issued.",
  })
  @ApiUnauthorizedResponse({ description: "MFA challenge is invalid." })
  verifyMfa(@Body() request: MfaVerificationDto) {
    return this.auth.verifyMfa(request);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rotate a refresh token" })
  @ApiOkResponse({
    schema: {
      example: {
        accessToken: "eyJ...signed-access-token",
        refreshToken: "opaque-refresh-token",
        accessTokenExpiresAt: "2026-11-05T04:15:00.000Z",
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: "Refresh token is invalid or expired.",
  })
  refresh(@Body() request: RefreshDto) {
    return this.auth.refresh(request.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke the current session" })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({
    description: "Access token or refresh token is invalid.",
  })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: LogoutDto,
  ): Promise<void> {
    await this.auth.logout(user, request.refreshToken);
  }
}
