import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsIn, IsOptional, IsString, IsUUID, Length } from "class-validator";

export const REPORT_TARGETS = ["vendor", "listing", "booking", "work_order", "purchase_order", "contract", "conversation"] as const;
export type ReportTarget = typeof REPORT_TARGETS[number];

export class CreateReportDto {
  @ApiProperty({ enum: REPORT_TARGETS }) @IsIn(REPORT_TARGETS)
  targetType!: ReportTarget;

  @ApiProperty({ format: "uuid" }) @IsUUID()
  targetId!: string;

  @ApiProperty() @IsString() @Length(1, 200)
  reason!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 4000)
  details?: string;
}

export class OpenCaseDto {
  @ApiProperty() @IsString() @Length(1, 200)
  subject!: string;

  @ApiProperty({ description: "Owner-configured severity; no fixed vocabulary is assumed." }) @IsString() @Length(1, 50)
  severity!: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  slaDueAt?: string;
}

export class UpdateCaseDto {
  @ApiProperty() @IsString() @Length(1, 1000)
  reason!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 50)
  severity?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 50)
  state?: string;

  @ApiPropertyOptional({ format: "uuid" }) @IsOptional() @IsUUID()
  assignedStaffUserId?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  slaDueAt?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 4000)
  resolution?: string;
}

export class CreateAppealDto {
  @ApiProperty() @IsString() @Length(1, 4000)
  reason!: string;
}

export class DecideAppealDto {
  @ApiProperty() @IsString() @Length(1, 100)
  outcome!: string;

  @ApiProperty() @IsString() @Length(1, 1000)
  reason!: string;
}
