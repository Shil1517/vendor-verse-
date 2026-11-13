import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class CreateContractDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  vendorId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ type: "object", additionalProperties: true })
  @IsObject()
  scope!: Record<string, unknown>;

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  schedule?: Record<string, unknown>;

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  priceSchedule?: Record<string, unknown>;

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  term?: Record<string, unknown>;
}

export class ContractVersionDto {
  @ApiProperty({ type: "object", additionalProperties: true })
  @IsObject()
  scope!: Record<string, unknown>;

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  schedule?: Record<string, unknown>;

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  priceSchedule?: Record<string, unknown>;

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  term?: Record<string, unknown>;
}

export class DeclineContractDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(1, 2000)
  reason!: string;
}

export class CreateMilestoneDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(1, 300)
  title!: string;

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  terms?: Record<string, unknown>;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  amountMinor?: number;

  @ApiPropertyOptional({ example: "INR" })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional()
  @IsISO8601()
  dueAt?: string;
}

export class MilestoneActionDto {
  @ApiProperty({ enum: ["start", "complete", "confirm", "dispute", "resolve"] })
  @IsIn(["start", "complete", "confirm", "dispute", "resolve"])
  action!: "start" | "complete" | "confirm" | "dispute" | "resolve";

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  supportCaseId?: string;
}
