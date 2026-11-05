import { IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RefreshDto {
  @ApiProperty({ example: "opaque-refresh-token", maxLength: 512 })
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  refreshToken!: string;
}
