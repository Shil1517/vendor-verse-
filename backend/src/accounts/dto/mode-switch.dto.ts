import { IsIn } from "class-validator";

export class ModeSwitchDto {
  @IsIn(["CUSTOMER", "VENDOR", "BUSINESS"])
  mode!: "CUSTOMER" | "VENDOR" | "BUSINESS";
}
