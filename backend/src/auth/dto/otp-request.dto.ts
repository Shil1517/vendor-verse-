import { Transform } from "class-transformer";
import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

export class OtpRequestDto {
  @IsIn(["phone", "email"])
  channel!: "phone" | "email";

  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @MinLength(1)
  @MaxLength(320)
  identifier!: string;
}
