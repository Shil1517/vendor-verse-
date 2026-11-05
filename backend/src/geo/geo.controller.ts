import {
  BadRequestException,
  Controller,
  Get,
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
}
