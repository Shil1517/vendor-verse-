import { IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ModeSwitchDto {
  @ApiProperty({
    enum: ["CUSTOMER", "VENDOR", "BUSINESS"],
    example: "CUSTOMER",
  })
  @IsIn(["CUSTOMER", "VENDOR", "BUSINESS"])
  mode!: "CUSTOMER" | "VENDOR" | "BUSINESS";
}
