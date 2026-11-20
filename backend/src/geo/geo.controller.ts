import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { GeoService } from "./geo.service";

const COUNTRY_CODE = /^[A-Z]{2}$/;

function countryCode(value: string | undefined): string {
  if (!value || !COUNTRY_CODE.test(value)) {
    throw new BadRequestException(
      "countryCode must be a two-letter uppercase country code",
    );
  }
  return value;
}

@Controller("geo")
@ApiTags("Geography")
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Get("countries")
  @ApiOperation({ summary: "Countries (F-GEO-01)" })
  @ApiOkResponse({ description: "All countries in the hierarchy." })
  async countries() {
    return { countries: await this.geo.listCountries() };
  }

  @Get("regions")
  @ApiOperation({ summary: "States or regions of a country (F-GEO-01)" })
  @ApiQuery({ name: "countryCode", example: "IN" })
  async regions(@Query("countryCode") code?: string) {
    return { regions: await this.geo.listRegions(countryCode(code)) };
  }

  @Get("cities")
  @ApiOperation({
    summary: "Cities of a country with launch status (F-GEO-01, F-GEO-02)",
    description:
      "launchStatus is live only for a city an admin activated; not_live cities are never shown as available.",
  })
  @ApiQuery({ name: "countryCode", example: "IN" })
  @ApiQuery({ name: "regionId", required: false })
  async cities(
    @Query("countryCode") code?: string,
    @Query("regionId", new ParseUUIDPipe({ optional: true }))
    regionId?: string,
  ) {
    return { cities: await this.geo.listCities(countryCode(code), regionId) };
  }

  @Get("localities")
  @ApiOperation({ summary: "Localities and pincodes of a city (F-GEO-01)" })
  @ApiQuery({ name: "cityId" })
  async localities(@Query("cityId", ParseUUIDPipe) cityId: string) {
    return { localities: await this.geo.listLocalities(cityId) };
  }

  @Get("pincodes/:pincode")
  @ApiOperation({
    summary: "Detect state, district and city from a pincode (F-GEO-01)",
    description:
      "India only. `supported` is true when the pincode maps to a city in our hierarchy; its launch status is on `city`. A pincode outside our cities is returned with `city: null`.",
  })
  @ApiQuery({ name: "countryCode", required: false, example: "IN" })
  async pincode(
    @Param("pincode") pincode: string,
    @Query("countryCode") code?: string,
  ) {
    return this.geo.lookupPincode(code ? countryCode(code) : "IN", pincode);
  }
}
