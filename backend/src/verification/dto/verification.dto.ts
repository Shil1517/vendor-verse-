import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  IsInt,
} from "class-validator";

export const VERIFICATION_LEVELS = ["L1", "L2", "L3"] as const;
export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];

export const REVIEW_STATUSES = [
  "in_review",
  "info_requested",
  "approved",
  "rejected",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const VERIFICATION_STATUSES = [
  "submitted",
  ...REVIEW_STATUSES,
  "expired",
  "revoked",
] as const;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class CreateVendorDocumentDto {
  @ApiProperty({ description: "Owner-defined evidence document type." })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  documentType!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  fileId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  issuedBy?: string;

  @ApiPropertyOptional({
    format: "date-time",
    description: "Optional document expiry; no expiry policy is assumed.",
  })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}

export class SubmitVerificationDto {
  @ApiProperty({ enum: VERIFICATION_LEVELS })
  @IsIn(VERIFICATION_LEVELS)
  level!: VerificationLevel;

  @ApiPropertyOptional({
    format: "uuid",
    description: "Required only for category-specific verification.",
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ type: String, format: "uuid", isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID("all", { each: true })
  documentIds?: string[];
}

export class VerificationReviewDto {
  @ApiProperty({ enum: REVIEW_STATUSES })
  @IsIn(REVIEW_STATUSES)
  status!: ReviewStatus;

  @ApiProperty({ minLength: 1, maxLength: 2000 })
  @Transform(trim)
  @IsString()
  @Length(1, 2000)
  reason!: string;

  @ApiPropertyOptional({
    format: "date-time",
    description: "Optional expiry date; set only when appropriate for evidence.",
  })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}

export class ListVerificationQueueQuery {
  @ApiPropertyOptional({ enum: VERIFICATION_STATUSES })
  @IsOptional()
  @IsIn(VERIFICATION_STATUSES)
  status?: (typeof VERIFICATION_STATUSES)[number];

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: "Opaque cursor returned by the previous page.",
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  cursor?: string;
}
