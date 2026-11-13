import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from "class-validator";

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class PurchaseOrderActionDto {
  @ApiProperty({ enum: ["accept", "reject", "process", "ship", "deliver", "complete", "cancel", "delivery_exception"] })
  @IsIn(["accept", "reject", "process", "ship", "deliver", "complete", "cancel", "delivery_exception"])
  action!: "accept" | "reject" | "process" | "ship" | "deliver" | "complete" | "cancel" | "delivery_exception";

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 2000)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  deliveryRegion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  carrier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 500)
  trackingReference?: string;
}

export class OpenPurchaseOrderDisputeDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  supportCaseId!: string;
}

export class ResolvePurchaseOrderDisputeDto {
  @ApiProperty({ enum: ["replace", "credit_note", "partial_refund", "close"] })
  @IsIn(["replace", "credit_note", "partial_refund", "close"])
  outcome!: "replace" | "credit_note" | "partial_refund" | "close";
}
