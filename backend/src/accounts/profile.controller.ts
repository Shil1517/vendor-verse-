import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import {
  CreateLocationDto,
  UpdateLocationDto,
  UpdateProfileDto,
} from "./dto/profile.dto";
import { ProfileService } from "./profile.service";

@Controller("me")
@UseGuards(AccessTokenGuard)
@ApiTags("Customer profile")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Access token is invalid or expired." })
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get("profile")
  @ApiOperation({ summary: "Get the authenticated user's profile (F-ACC-06)" })
  @ApiOkResponse({
    schema: {
      example: {
        userId: "2e7c2d89-4d25-496d-a643-2a7d95ca9db0",
        displayName: "Aarav Mehta",
        phone: "+919829000001",
        email: "aarav@example.com",
        emailVerified: false,
        customerType: "individual",
        companyName: null,
        locale: { country: "IN", language: "en", timeZone: "Asia/Kolkata", currency: "INR" },
      },
    },
  })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profiles.getProfile(user);
  }

  @Patch("profile")
  @ApiOperation({
    summary: "Update name, contact email, customer type or locale",
    description:
      "Omitted fields are unchanged. The email is stored unverified; the phone number is the verified sign-in identifier and cannot be changed here.",
  })
  @ApiOkResponse({ description: "The updated profile." })
  @ApiBadRequestResponse({ description: "A field failed validation." })
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: UpdateProfileDto,
  ) {
    return this.profiles.updateProfile(user, request);
  }

  @Get("locations")
  @ApiOperation({ summary: "List saved locations, default first" })
  @ApiOkResponse({ description: "The user's saved locations." })
  async listLocations(@CurrentUser() user: AuthenticatedUser) {
    return { locations: await this.profiles.listLocations(user) };
  }

  @Post("locations")
  @ApiOperation({ summary: "Add a saved location" })
  @ApiCreatedResponse({ description: "The created location." })
  @ApiBadRequestResponse({ description: "A field failed validation." })
  createLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: CreateLocationDto,
  ) {
    return this.profiles.createLocation(user, request);
  }

  @Patch("locations/:locationId")
  @ApiOperation({ summary: "Edit a saved location or make it the default" })
  @ApiOkResponse({ description: "The updated location." })
  @ApiNotFoundResponse({ description: "No such location for this user." })
  @ApiConflictResponse({ description: "The default cannot be unset directly." })
  updateLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("locationId", ParseUUIDPipe) locationId: string,
    @Body() request: UpdateLocationDto,
  ) {
    return this.profiles.updateLocation(user, locationId, request);
  }

  @Delete("locations/:locationId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a saved location" })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: "No such location for this user." })
  deleteLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("locationId", ParseUUIDPipe) locationId: string,
  ) {
    return this.profiles.deleteLocation(user, locationId);
  }
}
