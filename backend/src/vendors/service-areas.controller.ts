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
import { CreateServiceAreaDto } from "./dto/service-area.dto";
import { ServiceAreasService } from "./service-areas.service";

@Controller("vendors/:vendorId/service-areas")
@UseGuards(AccessTokenGuard)
@ApiTags("Vendors")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Access token is invalid or expired." })
@ApiNotFoundResponse({ description: "No such vendor for this user." })
export class ServiceAreasController {
  constructor(private readonly areas: ServiceAreasService) {}

  @Get()
  @ApiOperation({ summary: "List the vendor's declared coverage (F-GEO-06)" })
  @ApiOkResponse({ description: "Declared service areas, oldest first." })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
  ) {
    return { serviceAreas: await this.areas.list(user, vendorId) };
  }

  @Post()
  @ApiOperation({
    summary:
      "Declare coverage: city, pincode, region, country, radius or remote",
    description:
      "Coverage is always explicit; there is no worldwide option. Fields depend on coverageType. Send an Idempotency-Key to make retries safe.",
  })
  @ApiCreatedResponse({ description: "The declared service area." })
  @ApiBadRequestResponse({
    description:
      "A field failed validation or the city, region or country is unknown.",
  })
  @ApiConflictResponse({
    description: "The same coverage is already declared.",
  })
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
    @Body() request: CreateServiceAreaDto,
  ) {
    return this.areas.add(user, vendorId, request);
  }

  @Delete(":areaId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a declared service area" })
  @ApiNoContentResponse()
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
    @Param("areaId", ParseUUIDPipe) areaId: string,
  ) {
    return this.areas.remove(user, vendorId, areaId);
  }
}
