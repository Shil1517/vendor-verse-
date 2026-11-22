import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsObject, IsOptional, IsString, Length, Max, Min } from "class-validator";

export class CreatePlanDto {
  @ApiProperty() @IsString() @Length(1, 100)
  name!: string;
}

export class CreatePlanVersionDto {
  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @IsInt() @Min(0) @Max(Number.MAX_SAFE_INTEGER)
  priceMinor?: number;

  @ApiPropertyOptional({ example: "INR" }) @IsOptional() @IsString() @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 50)
  billingInterval?: string;

  @ApiProperty({ type: Object }) @IsObject()
  entitlements!: Record<string, unknown>;
}

export class SetPlanStatusDto {
  @ApiProperty({ enum: ["draft", "active", "retired"] }) @IsIn(["draft", "active", "retired"])
  status!: "draft" | "active" | "retired";

  @ApiProperty() @IsString() @Length(1, 1000)
  reason!: string;
}

export class MonitorSubscriptionsDto {
  @ApiPropertyOptional({ enum: ["active", "payment_failed", "expired", "cancel_at_period_end", "cancelled"] })
  @IsOptional() @IsIn(["active", "payment_failed", "expired", "cancel_at_period_end", "cancelled"])
  state?: string;
}
