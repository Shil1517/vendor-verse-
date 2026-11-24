import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsIn, IsObject, IsOptional, IsString, Length } from "class-validator";

export class CreateLeadDto {
  @ApiProperty() @IsString() @Length(1, 200)
  prospectName!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 200)
  businessName?: string;

  @ApiPropertyOptional({ type: Object }) @IsOptional() @IsObject()
  contactDetails?: Record<string, unknown>;
}

export class UpdateLeadDto {
  @ApiProperty({ description: "Owner-configured pipeline stage." }) @IsString() @Length(1, 100)
  status!: string;
}

export class AddLeadActivityDto {
  @ApiProperty({ enum: ["call", "message", "visit", "note"] }) @IsIn(["call", "message", "visit", "note"])
  activityType!: "call" | "message" | "visit" | "note";

  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 2000)
  notes?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  followUpAt?: string;
}
