import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from "class-validator";
import { IsTimeZone } from "./listing.dto";

export const WEEK_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export class UpsertAvailabilityRuleDto {
  @ApiProperty({
    example: "weekly_slots",
    description: "A model from the category's availabilityModels.",
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @Length(1, 60)
  availabilityModel!: string;

  @ApiProperty({ example: "Asia/Kolkata" })
  @IsTimeZone()
  timeZone!: string;

  @ApiProperty({
    example: { mon: [{ start: "09:00", end: "18:00" }], sun: [] },
    description:
      "Day keys mon..sun, each a list of { start, end } in 24-hour HH:MM, start before end, no overlaps. Missing or empty days are unavailable.",
  })
  @IsObject()
  weeklySchedule!: Record<string, unknown>;

  @ApiPropertyOptional({ example: "2026-11-10" })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  validFrom?: string;

  @ApiPropertyOptional({ example: "2027-03-31" })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  validTo?: string;
}

export class CreateCapacityWindowDto {
  @ApiProperty({ example: "2026-11-10T04:30:00Z" })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ example: "2026-11-10T12:30:00Z" })
  @IsDateString()
  endsAt!: string;

  @ApiProperty({
    example: 2,
    description: "Jobs that can run at once in this window.",
  })
  @IsInt()
  @Min(0)
  capacity!: number;
}
