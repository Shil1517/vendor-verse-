import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsOptional, IsString, IsUUID, Length } from "class-validator";

export class CreateCategorySuggestionDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  vendorId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  industryId!: string;

  @ApiProperty({ type: [String], description: "Proposed category path, from broad to specific." })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  proposedPath!: string[];

  @ApiProperty({ format: "uuid", description: "Existing approved category to use while the suggestion is reviewed." })
  @IsUUID()
  nearestCategoryId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  justification?: string;
}

export class DecideCategorySuggestionDto {
  @ApiProperty({ enum: ["approved", "rejected"] })
  @IsIn(["approved", "rejected"])
  decision!: "approved" | "rejected";

  @ApiProperty()
  @IsString()
  @Length(1, 1000)
  reason!: string;

  @ApiPropertyOptional({ format: "uuid", description: "Optional existing category created separately in the taxonomy builder." })
  @IsOptional()
  @IsUUID()
  createdCategoryId?: string;
}
