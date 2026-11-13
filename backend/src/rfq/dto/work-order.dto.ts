import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

export class WorkOrderActionDto {
  @ApiProperty({ enum: ["start", "complete", "confirm", "cancel"] })
  @IsIn(["start", "complete", "confirm", "cancel"])
  action!: "start" | "complete" | "confirm" | "cancel";
}
