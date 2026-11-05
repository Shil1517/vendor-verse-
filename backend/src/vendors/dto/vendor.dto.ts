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

export const BUSINESS_TYPES = [
  "SERVICE_PROVIDER",
  "CONTRACTOR",
  "SUPPLIER",
  "WHOLESALER",
  "MANUFACTURER",
  "DISTRIBUTOR",
  "OTHER",
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

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

  @ApiProperty({ enum: BUSINESS_TYPES })
  @IsIn(BUSINESS_TYPES)
  businessType!: BusinessType;

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
  @ApiPropertyOptional({ enum: BUSINESS_TYPES })
  @NotNullWhenPresent()
  @IsIn(BUSINESS_TYPES)
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
