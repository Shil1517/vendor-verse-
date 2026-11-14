import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export const PUBLIC_SEARCH_TYPES = [
  "vendor",
  "product",
  "service",
  "category",
] as const;
export const PRIVATE_SEARCH_TYPES = [
  "rfq",
  "booking",
  "contract",
  "purchase_order",
] as const;
export const SEARCH_TYPES = [
  ...PUBLIC_SEARCH_TYPES,
  ...PRIVATE_SEARCH_TYPES,
] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

/** Per-section page size when several types are searched at once. */
export const UNIVERSAL_DEFAULT_LIMIT = 5;
export const UNIVERSAL_MAX_LIMIT = 50;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

const toList = ({ value }: { value: unknown }): unknown =>
  typeof value === "string"
    ? value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    : value;

/** F-DSC-02 / D-025: one query across public and the caller's private records. */
export class UniversalSearchQueryDto {
  @ApiProperty({ minLength: 2, maxLength: 120 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  q!: string;

  @ApiProperty({ example: "IN", pattern: "^[A-Z]{2}$" })
  @Matches(/^[A-Z]{2}$/, {
    message: "countryCode must be a two-letter uppercase country code",
  })
  countryCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(16)
  postalCode?: string;

  @ApiPropertyOptional({
    description:
      "Comma-separated result types. Default: vendor, product, service and category, plus rfq, booking, contract and purchase_order when signed in. Asking for a private type without signing in is a 401.",
    example: "product,service,booking",
    enum: SEARCH_TYPES,
    isArray: true,
  })
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @ArrayUnique()
  @IsIn(SEARCH_TYPES, { each: true })
  types?: SearchType[];

  @ApiPropertyOptional({ maximum: UNIVERSAL_MAX_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(UNIVERSAL_MAX_LIMIT)
  limit?: number;

  @ApiPropertyOptional({
    description:
      "nextCursor of one section. Only valid when exactly one type is requested.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  cursor?: string;
}
