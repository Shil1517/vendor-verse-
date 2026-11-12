import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
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
import { CreateVendorDto, UpdateVendorDto } from "./dto/vendor.dto";
import { VendorsService } from "./vendors.service";

@Controller("vendors/:vendorId/public")
@ApiTags("Vendors")
export class PublicVendorsController {
  constructor(private readonly vendors: VendorsService) {}

  @Get()
  @ApiOperation({
    summary: "Public vendor profile with verified roles only (F-VND-09)",
    description:
      "Needs no sign-in. Only verified roles are shown (D-020, D-021); a vendor with no verified role is not public and answers 404. Ratings, response metrics and publication gates are not part of this read yet.",
  })
  @ApiOkResponse({ description: "The public vendor profile." })
  @ApiNotFoundResponse({ description: "No such public vendor." })
  get(@Param("vendorId", ParseUUIDPipe) vendorId: string) {
    return this.vendors.getPublic(vendorId);
  }
}

@Controller("vendors")
@UseGuards(AccessTokenGuard)
@ApiTags("Vendors")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Access token is invalid or expired." })
export class VendorsController {
  constructor(private readonly vendors: VendorsService) {}

  @Post()
  @ApiOperation({
    summary:
      "Become a vendor: country first, then type and names (F-VND-01, F-VND-02)",
    description:
      "Creates a registered (L0), unpublished vendor owned by the caller, who can then switch to VENDOR mode. Send an Idempotency-Key to make retries safe. How many vendors one owner may have is undecided, so none is enforced.",
  })
  @ApiCreatedResponse({ description: "The new vendor." })
  @ApiBadRequestResponse({
    description: "A field failed validation or the country is not supported.",
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: CreateVendorDto,
  ) {
    return this.vendors.create(user, request);
  }

  @Get("mine")
  @ApiOperation({ summary: "List the vendors the caller owns" })
  @ApiOkResponse({ description: "The caller's vendors, oldest first." })
  async listMine(@CurrentUser() user: AuthenticatedUser) {
    return { vendors: await this.vendors.listMine(user) };
  }

  @Get(":vendorId")
  @ApiOperation({ summary: "Get one of the caller's vendors" })
  @ApiOkResponse({ description: "The vendor and its editable profile." })
  @ApiNotFoundResponse({ description: "No such vendor for this user." })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
  ) {
    return this.vendors.get(user, vendorId);
  }

  @Patch(":vendorId")
  @ApiOperation({
    summary: "Edit the vendor's own details and profile",
    description:
      "Omitted fields are unchanged. Verification level, ratings and other platform-computed fields cannot be set here.",
  })
  @ApiOkResponse({ description: "The updated vendor." })
  @ApiBadRequestResponse({ description: "A field failed validation." })
  @ApiNotFoundResponse({ description: "No such vendor for this user." })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
    @Body() request: UpdateVendorDto,
  ) {
    return this.vendors.update(user, vendorId, request);
  }
}
