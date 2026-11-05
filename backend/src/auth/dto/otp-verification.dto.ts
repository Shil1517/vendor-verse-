import { IsString, IsUUID, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class OtpVerificationDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  challengeId!: string;

  @ApiProperty({ example: "123456", maxLength: 32 })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code!: string;
}
