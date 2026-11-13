import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from "class-validator";

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class CreateBookingDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  listingId!: string;

  @ApiProperty({ enum: ["instant", "scheduled"] })
  @IsIn(["instant", "scheduled"])
  mode!: "instant" | "scheduled";

  @ApiProperty({ format: "date-time" })
  @IsISO8601()
  slotStart!: string;

  @ApiProperty({ format: "date-time" })
  @IsISO8601()
  slotEnd!: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  timeZone!: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  capacityId?: string;

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  requestedTerms?: Record<string, unknown>;
}

export class BookingOccurrenceDto {
  @ApiProperty({ format: "date-time" })
  @IsISO8601()
  slotStart!: string;

  @ApiProperty({ format: "date-time" })
  @IsISO8601()
  slotEnd!: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  capacityId?: string;
}

export class CreateBookingSeriesDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  listingId!: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(1, 500)
  recurrenceRule!: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  timeZone!: string;

  @ApiProperty({ type: "array", items: { type: "object" } })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BookingOccurrenceDto)
  occurrences!: BookingOccurrenceDto[];

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  requestedTerms?: Record<string, unknown>;
}

export class BookingActionDto {
  @ApiProperty({ enum: ["accept", "decline", "start", "complete"] })
  @IsIn(["accept", "decline", "start", "complete"])
  action!: "accept" | "decline" | "start" | "complete";

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 2000)
  reason?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  capacityId?: string;
}

export class CancelBookingDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(1, 2000)
  reason!: string;

  @ApiPropertyOptional({ enum: ["occurrence", "series"] })
  @IsOptional()
  @IsIn(["occurrence", "series"])
  scope?: "occurrence" | "series";
}

export class ProposeBookingModificationDto {
  @ApiProperty({ type: "object", additionalProperties: true })
  @IsObject()
  proposedTerms!: Record<string, unknown>;
}

export class DecideBookingModificationDto {
  @ApiProperty()
  @IsBoolean()
  accept!: boolean;
}

export class ReportBookingCompletionDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  supportCaseId!: string;
}

export class ResolveBookingConflictsDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  keepBookingId!: string;

  @ApiProperty({ type: [String], format: "uuid" })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("all", { each: true })
  cancelBookingIds!: string[];
}
