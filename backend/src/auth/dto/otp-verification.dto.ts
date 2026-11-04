import { IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class OtpVerificationDto {
  @IsUUID()
  challengeId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code!: string;
}
