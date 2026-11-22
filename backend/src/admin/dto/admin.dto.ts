import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsObject, IsOptional, IsString, IsUUID, Length, Matches, Max, Min } from "class-validator";

export class AuditQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 100)
  action?: string;

  @ApiPropertyOptional({ format: "uuid" }) @IsOptional() @IsUUID()
  actorUserId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 100)
  targetType?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 200)
  targetId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 200)
  correlationId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number;
}

export class DecideConfigDto {
  @ApiProperty({ type: Object }) @IsObject()
  decidedValue!: Record<string, unknown>;

  @ApiProperty() @IsString() @Length(1, 1000)
  reason!: string;
}

export class SetPlatformSettingDto {
  @ApiProperty({ type: Object }) @IsObject()
  value!: Record<string, unknown>;

  @ApiProperty() @IsString() @Length(1, 1000)
  reason!: string;
}

export class ConfigCodeDto {
  @Matches(/^CFG-[0-9]{2}$/)
  code!: string;
}
