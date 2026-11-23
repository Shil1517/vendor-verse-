import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class AdminLoginDto {
  @ApiProperty({ example: "admin@example.com", maxLength: 254 })
  @IsString()
  @MinLength(1)
  @MaxLength(254)
  loginId!: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password!: string;
}
