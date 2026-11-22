import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Length, Max, Min } from "class-validator";

export class PaymentRecordQueryDto {
  @ApiProperty({ enum: ["booking", "purchase_order", "contract", "accepted_terms"] })
  @IsIn(["booking", "purchase_order", "contract", "accepted_terms"])
  parentType!: "booking" | "purchase_order" | "contract" | "accepted_terms";

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  parentId!: string;
}

export class CreatePaymentRecordDto extends PaymentRecordQueryDto {
  @ApiProperty({ enum: ["A", "B"] })
  @IsIn(["A", "B"])
  mode!: "A" | "B";

  @ApiProperty({ description: "Nonnegative amount in the currency's minor units." })
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  amountMinor!: number;

  @ApiProperty({ example: "INR" })
  @IsString()
  @Length(3, 3)
  currency!: string;

  @ApiProperty({ description: "An informational status, not verified by the platform." })
  @IsString()
  @Length(1, 100)
  status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 200)
  externalReference?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  termsSnapshot?: Record<string, unknown>;
}
