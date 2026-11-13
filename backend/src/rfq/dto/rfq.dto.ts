import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export const RFQ_KINDS = ["service", "goods"] as const;
export type RfqKind = (typeof RFQ_KINDS)[number];

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class CreateRfqDto {
  @ApiProperty()
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ enum: RFQ_KINDS })
  @IsIn(RFQ_KINDS)
  kind!: RfqKind;

  @ApiProperty({ type: "object", additionalProperties: true })
  @IsObject()
  requirements!: Record<string, unknown>;

  @ApiPropertyOptional({ type: [String], format: "uuid" })
  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  fileIds?: string[];
}

export class OpenRfqDto {
  @ApiProperty({ format: "date-time" })
  @IsISO8601()
  quoteDeadlineAt!: string;

  @ApiProperty({ type: [String], format: "uuid" })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("all", { each: true })
  vendorIds!: string[];
}

export class ReviseRfqDto {
  @ApiProperty({ type: "object", additionalProperties: true })
  @IsObject()
  requirements!: Record<string, unknown>;

  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional()
  @IsISO8601()
  quoteDeadlineAt?: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(1, 2000)
  changeReason!: string;

  @ApiPropertyOptional({ type: [String], format: "uuid" })
  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  fileIds?: string[];
}

export class QuoteLineDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(1, 1000)
  description!: string;

  @ApiProperty({ minimum: 0.001 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  unit?: string;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  unitPriceMinor!: number;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  lineTotalMinor!: number;

}

class QuoteFieldsDto {
  @ApiProperty({ example: "INR" })
  @IsIn(["INR"])
  @Matches(/^[A-Z]{3}$/)
  currency!: string;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  totalMinor!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 4000)
  scope?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inclusions?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exclusions?: string[];

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  timeline?: Record<string, unknown>;

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  terms?: Record<string, unknown>;

  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional()
  @IsISO8601()
  validUntil?: string;

  @ApiPropertyOptional({ type: [QuoteLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteLineDto)
  lines?: QuoteLineDto[];
}

export class CreateQuoteDto extends QuoteFieldsDto {
  @ApiProperty()
  @IsUUID()
  vendorId!: string;
}

export class QuoteRevisionDto extends QuoteFieldsDto {}

export class ExtendRfqDeadlineDto {
  @ApiProperty({ format: "date-time" })
  @IsISO8601()
  quoteDeadlineAt!: string;
}
