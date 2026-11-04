import { IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class MfaVerificationDto {
  @IsUUID()
  challengeId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code!: string;
}
