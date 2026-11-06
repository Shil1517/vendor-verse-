import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";
import { CATEGORY_LIFECYCLES, CategoryLifecycle } from "../category-input";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class CreateCategoryDto {
  @ApiProperty() @IsUUID() industryId!: string;

  @ApiProperty({ maxLength: 120 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: { hi: "प्लंबर" } })
  @IsOptional()
  @IsObject()
  localizedNames?: Record<string, string>;

  @ApiPropertyOptional({ example: [{ value: "plumber", locale: "en" }] })
  @IsOptional()
  @IsArray()
  aliases?: Array<{ value: string; locale?: string }>;

  @ApiPropertyOptional({
    description:
      "Category configuration (F-TAX-03). Only marketRules is validated here. Defaults to {}: a category with no market rule is hidden everywhere.",
  })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional() @IsOptional() @IsObject() localizedNames?: Record<
    string,
    string
  >;

  @ApiPropertyOptional() @IsOptional() @IsArray() aliases?: Array<{
    value: string;
    locale?: string;
  }>;

  @ApiPropertyOptional({
    description: "Replaces the whole configuration; omitted keys are dropped.",
  })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      "Show in public browse even without eligible listings. Not versioned.",
  })
  @IsOptional()
  @IsBoolean()
  alwaysShow?: boolean;
}

export class ChangeLifecycleDto {
  @ApiProperty({ enum: CATEGORY_LIFECYCLES })
  @IsIn(CATEGORY_LIFECYCLES)
  to!: CategoryLifecycle;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}

export class MergeCategoryDto {
  @ApiProperty({ description: "The category that absorbs this one." })
  @IsUUID()
  intoCategoryId!: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}

export class ReorderCategoriesDto {
  @ApiProperty({
    description:
      "Every category of the industry (any lifecycle), in the new order.",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  categoryIds!: string[];
}

export class CreateSubcategoryDto {
  @ApiProperty({ maxLength: 120 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional() @IsOptional() @IsObject() localizedNames?: Record<
    string,
    string
  >;

  @ApiPropertyOptional() @IsOptional() @IsArray() aliases?: Array<{
    value: string;
    locale?: string;
  }>;
}

export class UpdateSubcategoryDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional() @IsOptional() @IsObject() localizedNames?: Record<
    string,
    string
  >;

  @ApiPropertyOptional() @IsOptional() @IsArray() aliases?: Array<{
    value: string;
    locale?: string;
  }>;
}

export class AdminCategoryListQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() industryId?: string;

  @ApiPropertyOptional({ enum: CATEGORY_LIFECYCLES })
  @IsOptional()
  @IsIn(CATEGORY_LIFECYCLES)
  lifecycle?: CategoryLifecycle;
}
