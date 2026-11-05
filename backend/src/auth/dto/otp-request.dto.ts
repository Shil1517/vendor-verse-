import { Transform } from "class-transformer";
import { IsIn, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class OtpRequestDto {
  @ApiProperty({ enum: ["phone", "email"], example: "email" })
  @IsIn(["phone", "email"])
  channel!: "phone" | "email";

  @ApiProperty({ example: "person@example.com", maxLength: 320 })
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @MinLength(1)
  @MaxLength(320)
  identifier!: string;
}
