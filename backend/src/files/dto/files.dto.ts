import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateFileDto {
  @ApiProperty({
    example: "verification-evidence",
    description: "What the file is for; becomes the first storage key segment.",
  })
  @IsString()
  @Matches(/^[a-z][a-z0-9-]{0,62}$/)
  purpose!: string;

  @ApiPropertyOptional({ example: "licence.pdf" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  originalName?: string;

  @ApiProperty({ example: "application/pdf" })
  @IsString()
  @Matches(
    /^[a-zA-Z0-9][a-zA-Z0-9!#$&^_.+-]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&^_.+-]*$/,
  )
  @MaxLength(127)
  contentType!: string;

  @ApiProperty({
    description: "Exact size in bytes; checked against the limit.",
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  sizeBytes!: number;

  @ApiPropertyOptional({ description: "Lowercase hex SHA-256 of the bytes." })
  @IsOptional()
  @Matches(/^[0-9a-fA-F]{64}$/)
  checksumSha256?: string;
}
