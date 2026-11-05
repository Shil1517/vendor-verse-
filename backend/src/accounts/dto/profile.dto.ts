import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateIf,
  ValidateNested,
  registerDecorator,
  ValidationOptions,
} from "class-validator";

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

/** Skips validation only when the field is absent; an explicit null is rejected. */
const NotNullWhenPresent = () =>
  ValidateIf((_: unknown, value: unknown) => value !== undefined);

/** Valid IANA zone, e.g. "Asia/Kolkata". */
function IsTimeZone(options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: "isTimeZone",
      target: target.constructor,
      propertyName,
      options: { message: "timeZone must be an IANA time zone", ...options },
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

export class ProfileLocaleDto {
  @ApiPropertyOptional({ example: "IN", description: "ISO 3166-1 alpha-2" })
  @NotNullWhenPresent()
  @Matches(/^[A-Z]{2}$/)
  country?: string;

  /** English and Hindi at launch (D-008); more languages are Phase 2. */
  @ApiPropertyOptional({ enum: ["en", "hi"] })
  @NotNullWhenPresent()
  @IsIn(["en", "hi"])
  language?: "en" | "hi";

  @ApiPropertyOptional({ example: "Asia/Kolkata" })
  @NotNullWhenPresent()
  @IsTimeZone()
  timeZone?: string;

  @ApiPropertyOptional({ example: "INR", description: "ISO 4217" })
  @NotNullWhenPresent()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;
}

/** PATCH semantics: an omitted field is unchanged; `null` clears email and companyName. */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: "Aarav Mehta", minLength: 2, maxLength: 120 })
  @NotNullWhenPresent()
  @Transform(trim)
  @IsString()
  @Length(2, 120)
  displayName?: string;

  @ApiPropertyOptional({
    example: "aarav@example.com",
    nullable: true,
    description:
      "Unverified contact email. Verification arrives with email OTP delivery.",
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @Length(3, 254)
  email?: string | null;

  @ApiPropertyOptional({ enum: ["individual", "business"] })
  @NotNullWhenPresent()
  @IsIn(["individual", "business"])
  customerType?: "individual" | "business";

  @ApiPropertyOptional({ nullable: true, maxLength: 160 })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Transform(trim)
  @IsString()
  @Length(1, 160)
  companyName?: string | null;

  @ApiPropertyOptional({ type: ProfileLocaleDto })
  @NotNullWhenPresent()
  @ValidateNested()
  @Type(() => ProfileLocaleDto)
  locale?: ProfileLocaleDto;
}

export class CreateLocationDto {
  @ApiProperty({ example: "Home", maxLength: 60 })
  @Transform(trim)
  @IsString()
  @Length(1, 60)
  label!: string;

  @ApiProperty({ example: "24, Vaishali Nagar, Jaipur 302021", maxLength: 300 })
  @Transform(trim)
  @IsString()
  @Length(1, 300)
  addressText!: string;

  @ApiPropertyOptional({ example: "302021", maxLength: 12 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 12)
  postalCode?: string;

  @ApiPropertyOptional({ format: "uuid", description: "A city from the geography hierarchy." })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional({ description: "The first location is always the default." })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateLocationDto {
  @ApiPropertyOptional({ maxLength: 60 })
  @NotNullWhenPresent()
  @Transform(trim)
  @IsString()
  @Length(1, 60)
  label?: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @NotNullWhenPresent()
  @Transform(trim)
  @IsString()
  @Length(1, 300)
  addressText?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 12 })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Transform(trim)
  @IsString()
  @Length(1, 12)
  postalCode?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  cityId?: string | null;

  @ApiPropertyOptional({
    description:
      "true makes this the default. To change the default, set another location to true.",
  })
  @NotNullWhenPresent()
  @IsBoolean()
  isDefault?: boolean;
}
