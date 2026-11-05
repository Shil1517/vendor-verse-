import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from "class-validator";

/** There is deliberately no "worldwide" type (F-GEO-06). */
export const COVERAGE_TYPES = [
  "city",
  "pincode",
  "region",
  "country",
  "radius",
  "remote",
] as const;
export type CoverageType = (typeof COVERAGE_TYPES)[number];

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;
const is =
  (...types: CoverageType[]) =>
  (o: { coverageType?: string }) =>
    types.includes(o.coverageType as CoverageType);

/**
 * One coverage declaration. The fields required depend on `coverageType`:
 * city -> cityId; pincode -> countryCode + postalCode; region -> regionId;
 * country -> countryCode; radius -> radiusKm + latitude + longitude; remote -> none.
 */
export class CreateServiceAreaDto {
  @ApiProperty({ enum: COVERAGE_TYPES })
  @IsIn(COVERAGE_TYPES)
  coverageType!: CoverageType;

  @ApiPropertyOptional({ description: "For coverageType city." })
  @ValidateIf(is("city"))
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional({ description: "For coverageType region." })
  @ValidateIf(is("region"))
  @IsUUID()
  regionId?: string;

  @ApiPropertyOptional({
    example: "IN",
    description: "For coverageType pincode or country.",
  })
  @ValidateIf(is("pincode", "country"))
  @Matches(/^[A-Z]{2}$/)
  countryCode?: string;

  @ApiPropertyOptional({
    example: "302021",
    description: "For coverageType pincode.",
  })
  @ValidateIf(is("pincode"))
  @Transform(trim)
  @IsString()
  @Length(1, 16)
  postalCode?: string;

  @ApiPropertyOptional({
    example: 15,
    description: "Kilometres, for coverageType radius.",
  })
  @ValidateIf(is("radius"))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999)
  radiusKm?: number;

  @ApiPropertyOptional({ description: "Centre of the radius." })
  @ValidateIf(is("radius"))
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional()
  @ValidateIf(is("radius"))
  @IsLongitude()
  longitude?: number;
}
