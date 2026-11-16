import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from "class-validator";

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export const LISTING_REVIEW_STATUSES = [
  "approved",
  "changes_requested",
  "rejected",
] as const;
export type ListingReviewStatus = (typeof LISTING_REVIEW_STATUSES)[number];

export class ListingReviewDecisionDto {
  @ApiProperty({ enum: LISTING_REVIEW_STATUSES })
  @IsIn(LISTING_REVIEW_STATUSES)
  status!: ListingReviewStatus;

  @ApiProperty({ minLength: 1, maxLength: 2000 })
  @Transform(trim)
  @IsString()
  @Length(1, 2000)
  reason!: string;
}

export const DUPLICATE_REVIEW_STATUSES = [
  "confirmed_duplicate",
  "not_duplicate",
] as const;
export type DuplicateReviewStatus = (typeof DUPLICATE_REVIEW_STATUSES)[number];

export class DuplicateReviewDecisionDto {
  @ApiProperty({ enum: DUPLICATE_REVIEW_STATUSES })
  @IsIn(DUPLICATE_REVIEW_STATUSES)
  status!: DuplicateReviewStatus;

  @ApiProperty({ minLength: 1, maxLength: 2000 })
  @Transform(trim)
  @IsString()
  @Length(1, 2000)
  reason!: string;
}

export const LISTING_MEDIA_TYPES = ["photo", "portfolio"] as const;
export type ListingMediaType = (typeof LISTING_MEDIA_TYPES)[number];

export class CreateListingMediaDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  fileId!: string;

  @ApiProperty({ enum: LISTING_MEDIA_TYPES })
  @IsIn(LISTING_MEDIA_TYPES)
  mediaType!: ListingMediaType;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 500)
  caption?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;
}

export const LISTING_MEDIA_REVIEW_STATUSES = ["approved", "rejected"] as const;
export type ListingMediaReviewStatus =
  (typeof LISTING_MEDIA_REVIEW_STATUSES)[number];

export class ListingMediaReviewDecisionDto {
  @ApiProperty({ enum: LISTING_MEDIA_REVIEW_STATUSES })
  @IsIn(LISTING_MEDIA_REVIEW_STATUSES)
  status!: ListingMediaReviewStatus;

  @ApiProperty({ minLength: 1, maxLength: 2000 })
  @Transform(trim)
  @IsString()
  @Length(1, 2000)
  reason!: string;
}

export const PROFILE_IMAGE_TYPES = ["logo", "banner"] as const;
export type ProfileImageType = (typeof PROFILE_IMAGE_TYPES)[number];

export const PROFILE_IMAGE_REVIEW_STATUSES = ["approved", "rejected"] as const;
export type ProfileImageReviewStatus =
  (typeof PROFILE_IMAGE_REVIEW_STATUSES)[number];

export class ProfileImageReviewDecisionDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  fileId!: string;

  @ApiProperty({ enum: PROFILE_IMAGE_TYPES })
  @IsIn(PROFILE_IMAGE_TYPES)
  imageType!: ProfileImageType;

  @ApiProperty({ enum: PROFILE_IMAGE_REVIEW_STATUSES })
  @IsIn(PROFILE_IMAGE_REVIEW_STATUSES)
  status!: ProfileImageReviewStatus;

  @ApiProperty({ minLength: 1, maxLength: 2000 })
  @Transform(trim)
  @IsString()
  @Length(1, 2000)
  reason!: string;
}

export class ListListingReviewQueueQuery {
  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
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

export class ListDuplicateQueueQuery extends ListListingReviewQueueQuery {}

export class ListProfileImageQueueQuery extends ListListingReviewQueueQuery {}
