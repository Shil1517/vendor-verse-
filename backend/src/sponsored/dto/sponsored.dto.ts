import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsObject, IsOptional, IsString, IsUUID, Length } from "class-validator";

export class CreateCampaignDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID()
  listingId?: string;

  @ApiProperty() @IsString() @Length(1, 100)
  placement!: string;

  @ApiPropertyOptional({ type: Object }) @IsOptional() @IsObject()
  configuration?: Record<string, unknown>;
}

export class SetCampaignStatusDto {
  @ApiProperty({ enum: ["pending_review", "paused", "ended"] })
  @IsIn(["pending_review", "paused", "ended"])
  status!: "pending_review" | "paused" | "ended";

  @ApiProperty() @IsString() @Length(1, 1000)
  reason!: string;
}
