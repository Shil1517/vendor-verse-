import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { CategoryListQueryDto, MarketQueryDto } from "./dto/market-query.dto";
import { TaxonomyService } from "./taxonomy.service";

const market = ({ countryCode, regionId, cityId }: MarketQueryDto) => ({
  countryCode,
  regionId,
  cityId,
});

@Controller("taxonomy")
@ApiTags("Taxonomy")
export class TaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Get("industries")
  @ApiOperation({
    summary: "List industries available in a market",
    description:
      "Industries with at least one publicly browsable category in the market (F-TAX-01).",
  })
  @ApiOkResponse({
    schema: {
      example: {
        items: [
          {
            industryId: "6f1c2d1e-3f4a-5b6c-8d7e-9f0a1b2c3d4e",
            name: "Construction",
            localizedNames: {},
            phase: "P1",
          },
        ],
      },
    },
  })
  @ApiBadRequestResponse({ description: "Invalid market query." })
  listIndustries(@Query() query: MarketQueryDto) {
    return this.taxonomy.listIndustries(market(query));
  }

  @Get("categories")
  @ApiOperation({
    summary: "Browse publicly available categories and subcategories",
    description:
      "Active categories enabled in the market, with their subcategories (F-TAX-01).",
  })
  @ApiOkResponse({ schema: { example: { items: [] } } })
  @ApiBadRequestResponse({ description: "Invalid market or industry filter." })
  listCategories(@Query() query: CategoryListQueryDto) {
    return this.taxonomy.listCategories(market(query), query.industryId);
  }

  @Get("categories/:categoryId")
  @ApiOperation({
    summary: "Get the active category and its form configuration",
    description:
      "Public projection used by schema-driven forms: booking modes, availability models, attribute and RFQ schemas (F-TAX-08).",
  })
  @ApiOkResponse({ description: "The category and its public configuration." })
  @ApiBadRequestResponse({
    description: "Invalid category id or market query.",
  })
  @ApiNotFoundResponse({
    description: "The category is unavailable for browse in this market.",
  })
  getCategory(
    @Param("categoryId", new ParseUUIDPipe()) categoryId: string,
    @Query() query: MarketQueryDto,
  ) {
    return this.taxonomy.getCategory(categoryId, market(query));
  }
}
