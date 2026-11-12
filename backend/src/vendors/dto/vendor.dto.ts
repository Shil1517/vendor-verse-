import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from "class-validator";

/**
 * Vendor role codes are data, not a fixed list (D-024). The shape is checked
 * here; whether a code is an active role is checked against the catalogue.
 */
export const ROLE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;
export type BusinessType = string;

/** Languages offered in Phase 1 (F-XCT-01). */
export const VENDOR_LANGUAGES = ["en", "hi"] as const;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

/** Skips validation only when the field is absent; an explicit null is rejected. */
const NotNullWhenPresent = () =>
  ValidateIf((_: unknown, value: unknown) => value !== undefined);

export class CreateVendorDto {
  @ApiProperty({
    example: "IN",
    description:
      "Registration country, chosen first (F-VND-02). ISO 3166-1 alpha-2.",
  })
  @Matches(/^[A-Z]{2}$/)
  registrationCountry!: string;

  @ApiProperty({
    example: "MANUFACTURER",
    description:
      "The primary vendor role. Must be an active role from GET /vendor-roles.",
  })
  @Matches(ROLE_CODE_PATTERN)
  businessType!: BusinessType;

  @ApiPropertyOptional({
    type: [String],
    example: ["WHOLESALER"],
    description:
      "More vendor roles held from the start (D-023). Each starts pending and is hidden publicly until verified.",
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(20)
  @Matches(ROLE_CODE_PATTERN, { each: true })
  roleCodes?: string[];

  @ApiProperty({ example: "Sharma Electricals Pvt Ltd" })
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  legalName!: string;

  @ApiPropertyOptional({ example: "Sharma Electricals" })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  tradingName?: string;
}

export class UpdateVendorDto {
  @ApiPropertyOptional({
    description:
      "Change the primary role. It is added as a pending role if the vendor does not hold it yet.",
  })
  @NotNullWhenPresent()
  @Matches(ROLE_CODE_PATTERN)
  businessType?: BusinessType;

  @ApiPropertyOptional()
  @NotNullWhenPresent()
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  legalName?: string;

  @ApiPropertyOptional()
  @NotNullWhenPresent()
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  tradingName?: string;

  @ApiPropertyOptional()
  @NotNullWhenPresent()
  @Transform(trim)
  @IsString()
  @Length(1, 2000)
  description?: string;

  @ApiPropertyOptional({ enum: VENDOR_LANGUAGES, isArray: true })
  @NotNullWhenPresent()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(VENDOR_LANGUAGES.length)
  @IsIn(VENDOR_LANGUAGES, { each: true })
  languages?: string[];

  @ApiPropertyOptional({ example: 2012 })
  @NotNullWhenPresent()
  @IsInt()
  @Min(1800)
  @Max(2100)
  yearEstablished?: number;
}
