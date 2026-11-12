import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
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

export const OFFER_TYPES = ["products", "services"] as const;
export type OfferType = (typeof OFFER_TYPES)[number];

/** Role states. `pending` waits for review; only `verified` roles are public (D-020, D-021). */
export const ROLE_STATUSES = [
  "pending",
  "verified",
  "rejected",
  "revoked",
] as const;
export type RoleStatus = (typeof ROLE_STATUSES)[number];

export const ROLE_DECISIONS = ["verified", "rejected", "revoked"] as const;
export type RoleDecision = (typeof ROLE_DECISIONS)[number];

const ROLE_CODE = /^[A-Z][A-Z0-9_]{1,63}$/;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

/** Skips validation only when the field is absent; an explicit null is rejected. */
const NotNullWhenPresent = () =>
  ValidateIf((_: unknown, value: unknown) => value !== undefined);

export class CreateRoleDefinitionDto {
  @ApiProperty({
    example: "RETAILER",
    description: "Stable code. Upper case letters, digits and underscores.",
  })
  @Matches(ROLE_CODE)
  code!: string;

  @ApiProperty({ example: "Retailer" })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 500)
  description?: string;

  @ApiPropertyOptional({ enum: OFFER_TYPES })
  @IsOptional()
  @IsIn(OFFER_TYPES)
  offerType?: OfferType;

  @ApiPropertyOptional({
    type: [String],
    description:
      "Documents a vendor with this role must submit. A vendor submits the combined set for its roles.",
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @Length(1, 200, { each: true })
  requiredDocuments?: string[];
}

export class UpdateRoleDefinitionDto {
  @ApiPropertyOptional()
  @NotNullWhenPresent()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  label?: string;

  @ApiPropertyOptional()
  @NotNullWhenPresent()
  @Transform(trim)
  @IsString()
  @Length(1, 500)
  description?: string;

  @ApiPropertyOptional({ enum: OFFER_TYPES })
  @NotNullWhenPresent()
  @IsIn(OFFER_TYPES)
  offerType?: OfferType;

  @ApiPropertyOptional({ type: [String] })
  @NotNullWhenPresent()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @Length(1, 200, { each: true })
  requiredDocuments?: string[];

  @ApiPropertyOptional({
    description: "false retires the role: new vendors cannot pick it.",
  })
  @NotNullWhenPresent()
  @IsBoolean()
  isActive?: boolean;
}

export class AddVendorRoleDto {
  @ApiProperty({ example: "WHOLESALER" })
  @Matches(ROLE_CODE)
  roleCode!: string;
}

export class RoleDecisionDto {
  @ApiProperty({ enum: ROLE_DECISIONS })
  @IsIn(ROLE_DECISIONS)
  decision!: RoleDecision;

  @ApiProperty({ description: "Required and audited." })
  @Transform(trim)
  @IsString()
  @Length(1, 1000)
  reason!: string;
}

export class ListRoleDefinitionsQuery {
  @ApiPropertyOptional({
    description: "Include retired roles. Only useful to administrators.",
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  includeRetired?: boolean;
}

export class ListRoleReviewQuery {
  @ApiPropertyOptional({ enum: ROLE_STATUSES, default: "pending" })
  @IsOptional()
  @IsIn(ROLE_STATUSES)
  status?: RoleStatus;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
