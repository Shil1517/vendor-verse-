import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
  ValidateIf,
  registerDecorator,
  ValidationOptions,
} from "class-validator";

export const LISTING_TYPES = ["service", "product"] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

/** Skips validation only when the field is absent; an explicit null is rejected. */
const NotNullWhenPresent = () =>
  ValidateIf((_: unknown, value: unknown) => value !== undefined);

/** Valid IANA zone, e.g. "Asia/Kolkata". */
export function IsTimeZone(options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: "isTimeZone",
      target: target.constructor,
      propertyName,
      options: {
        message: `${propertyName} must be an IANA time zone`,
        ...options,
      },
      validator: {
        validate(value: unknown) {
          if (typeof value !== "string" || value.length === 0) return false;
          try {
            new Intl.DateTimeFormat("en", { timeZone: value });
            return true;
          } catch {
            return false;
          }
        },
      },
    });
}

/** Fields shared by create and edit. On edit every field is optional. */
class ListingFieldsDto {
  @ApiPropertyOptional()
  @NotNullWhenPresent()
  @Transform(trim)
  @IsString()
  @Length(1, 4000)
  description?: string;

  @ApiPropertyOptional({
    description: "Price on request; then no price range may be sent.",
  })
  @NotNullWhenPresent()
  @IsBoolean()
  priceOnRequest?: boolean;

  @ApiPropertyOptional({ example: 50000, description: "Minor units (paise)." })
  @NotNullWhenPresent()
  @IsInt()
  @Min(0)
  priceMinMinor?: number;

  @ApiPropertyOptional({ example: 150000, description: "Minor units (paise)." })
  @NotNullWhenPresent()
  @IsInt()
  @Min(0)
  priceMaxMinor?: number;

  @ApiPropertyOptional({ example: "INR" })
  @NotNullWhenPresent()
  @Matches(/^[A-Z]{3}$/)
  priceCurrency?: string;

  @ApiPropertyOptional({ example: "per visit" })
  @NotNullWhenPresent()
  @Transform(trim)
  @IsString()
  @Length(1, 60)
  priceUnit?: string;

  @ApiPropertyOptional({ example: "Asia/Kolkata" })
  @NotNullWhenPresent()
  @IsTimeZone()
  timeZone?: string;

  @ApiPropertyOptional({
    description:
      "Category attributes by key. Stored as sent; the category schema is not enforced yet.",
  })
  @NotNullWhenPresent()
  @IsObject()
  attributes?: Record<string, unknown>;
}

export class CreateListingDto extends ListingFieldsDto {
  @ApiProperty({
    description:
      "An ACTIVE category; its current configuration version is pinned.",
  })
  @IsUUID()
  categoryId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  subcategoryId?: string;

  @ApiProperty({ enum: LISTING_TYPES })
  @IsIn(LISTING_TYPES)
  listingType!: ListingType;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  title!: string;
}

export class UpdateListingDto extends ListingFieldsDto {
  @ApiPropertyOptional()
  @NotNullWhenPresent()
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  title?: string;
}
