import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { IsTimeZone } from "../../listings/dto/listing.dto";

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export const BOOKING_STATES = [
  "draft",
  "requested",
  "confirmed",
  "declined",
  "expired",
  "in_progress",
  "completed_awaiting",
  "closed",
  "cancelled",
] as const;
export type BookingState = (typeof BOOKING_STATES)[number];

export class SlotDto {
  @ApiProperty({ example: "2026-12-01T09:00:00+05:30" })
  @IsDateString()
  slotStart!: string;

  @ApiProperty({ example: "2026-12-01T11:00:00+05:30" })
  @IsDateString()
  slotEnd!: string;
}

export class RecurrenceDto {
  @ApiProperty({
    description:
      "How the series repeats, for display and audit (for example an RRULE string). The client expands it into occurrences.",
  })
  @Transform(trim)
  @IsString()
  @Length(1, 500)
  rule!: string;

  @ApiProperty({ type: [SlotDto], description: "At least two occurrences." })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => SlotDto)
  occurrences!: SlotDto[];
}

/** F-BKG-01 / F-BKG-02 / F-BKG-03 / F-BKG-08. */
export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  listingId!: string;

  @ApiPropertyOptional({
    enum: ["instant", "scheduled"],
    default: "scheduled",
    description:
      "Instant needs a listing with instant booking on and a slot inside its capacity.",
  })
  @IsOptional()
  @IsIn(["instant", "scheduled"])
  mode?: "instant" | "scheduled";

  @ApiPropertyOptional({ example: "2026-12-01T09:00:00+05:30" })
  @ValidateIf((o: CreateBookingDto) => o.slotEnd !== undefined || o.timeZone !== undefined || o.mode === "instant" || o.slotStart !== undefined)
  @IsDateString()
  slotStart?: string;

  @ApiPropertyOptional({ example: "2026-12-01T11:00:00+05:30" })
  @ValidateIf((o: CreateBookingDto) => o.slotStart !== undefined)
  @IsDateString()
  slotEnd?: string;

  @ApiPropertyOptional({ example: "Asia/Kolkata", description: "Required with a slot." })
  @ValidateIf((o: CreateBookingDto) => o.slotStart !== undefined)
  @IsTimeZone()
  timeZone?: string;

  @ApiPropertyOptional({ description: "Free-form request details, for example address and notes." })
  @IsOptional()
  @IsObject()
  requestedTerms?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: RecurrenceDto,
    description:
      "Creates a series of linked bookings (F-BKG-03); then slotStart/slotEnd are not used and timeZone is required.",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceDto)
  recurrence?: RecurrenceDto;
}

export class DeclineBookingDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(1, 1000)
  reason!: string;
}

export class CancelBookingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 1000)
  reason?: string;

  @ApiPropertyOptional({
    description:
      "Customer only, for a booking in a series: also cancel every later open occurrence (D-011). Default: this occurrence only.",
  })
  @IsOptional()
  @IsBoolean()
  cancelSeries?: boolean;
}

/** F-BKG-04: the original terms stay in force until the other side accepts. */
export class ProposeModificationDto {
  @ApiProperty({ description: "The changed terms, merged over the current ones when accepted." })
  @IsObject()
  proposedTerms!: Record<string, unknown>;

  @ApiPropertyOptional()
  @ValidateIf((o: ProposeModificationDto) => o.slotEnd !== undefined || o.timeZone !== undefined)
  @IsDateString()
  slotStart?: string;

  @ApiPropertyOptional()
  @ValidateIf((o: ProposeModificationDto) => o.slotStart !== undefined)
  @IsDateString()
  slotEnd?: string;

  @ApiPropertyOptional()
  @ValidateIf((o: ProposeModificationDto) => o.slotStart !== undefined)
  @IsTimeZone()
  timeZone?: string;
}

export class ListBookingsQueryDto {
  @ApiPropertyOptional({ enum: BOOKING_STATES })
  @IsOptional()
  @IsIn(BOOKING_STATES)
  state?: BookingState;
}
