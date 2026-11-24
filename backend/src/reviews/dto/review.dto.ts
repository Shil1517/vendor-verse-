import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min, ValidateNested } from "class-validator";

export const REVIEW_TRANSACTION_TYPES = ["booking", "work_order", "purchase_order", "contract_milestone"] as const;
export type ReviewTransactionType = typeof REVIEW_TRANSACTION_TYPES[number];

export class RatingDimensionDto {
  @ApiProperty() @IsString() @Length(1, 50)
  dimension!: string;

  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5)
  rating!: number;
}

export class CreateReviewDto {
  @ApiProperty({ enum: REVIEW_TRANSACTION_TYPES }) @IsIn(REVIEW_TRANSACTION_TYPES)
  transactionType!: ReviewTransactionType;

  @ApiProperty({ format: "uuid" }) @IsUUID()
  transactionId!: string;

  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5)
  overallRating!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 2000)
  comment?: string;

  @ApiPropertyOptional({ type: [RatingDimensionDto] }) @IsOptional() @IsArray() @ArrayMaxSize(4)
  @ValidateNested({ each: true }) @Type(() => RatingDimensionDto)
  dimensions?: RatingDimensionDto[];
}

export class RespondToReviewDto {
  @ApiProperty() @IsString() @Length(1, 2000)
  response!: string;
}
