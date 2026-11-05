import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator";

export class MarketQueryDto {
  @ApiProperty({
    description: "ISO 3166-1 alpha-2 country code for market eligibility.",
    example: "IN",
    pattern: "^[A-Z]{2}$",
  })
  @Matches(/^[A-Z]{2}$/, {
    message: "countryCode must be a two-letter uppercase country code",
  })
  countryCode!: string;

  @ApiPropertyOptional({
    description: "Region identifier from the geography API.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  regionId?: string;

  @ApiPropertyOptional({
    description: "City identifier from the geography API.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  cityId?: string;
}

export class CategoryListQueryDto extends MarketQueryDto {
  @ApiPropertyOptional({ description: "Limit results to an industry." })
  @IsOptional()
  @IsUUID()
  industryId?: string;
}
