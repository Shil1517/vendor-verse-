import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export const SEARCH_MAX_LIMIT = 50;
export const SEARCH_DEFAULT_LIMIT = 20;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === "true" ? true : value === "false" ? false : value;

/** F-DSC-02 / F-DSC-04. "Where" is a market plus an optional city or postcode. */
export class SearchListingsQueryDto {
  @ApiProperty({ example: "IN", pattern: "^[A-Z]{2}$" })
  @Matches(/^[A-Z]{2}$/, {
    message: "countryCode must be a two-letter uppercase country code",
  })
  countryCode!: string;

  @ApiPropertyOptional({ description: "City from the geography API." })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional({
    description: "Region; used when no city is given.",
  })
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @ApiPropertyOptional({ description: "Postcode for pincode coverage." })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(16)
  postalCode?: string;

  @ApiPropertyOptional({ description: "Free text, matched on title, description and vendor name." })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  industryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  subcategoryId?: string;

  @ApiPropertyOptional({ enum: ["service", "product"] })
  @IsOptional()
  @IsIn(["service", "product"])
  listingType?: "service" | "product";

  @ApiPropertyOptional({
    description: "Vendor role code from GET /vendor-roles (supplier and manufacturer search, F-DSC-04).",
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(64)
  vendorRole?: string;

  @ApiPropertyOptional({ description: "Minor units. Listings without a stated price are excluded when set." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPriceMinor?: number;

  @ApiPropertyOptional({ description: "Minor units. Listings without a stated price are excluded when set." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPriceMinor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  instantOnly?: boolean;

  @ApiPropertyOptional({ maximum: SEARCH_MAX_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SEARCH_MAX_LIMIT)
  limit?: number;

  @ApiPropertyOptional({ description: "Opaque; the nextCursor of the previous page." })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  cursor?: string;
}
