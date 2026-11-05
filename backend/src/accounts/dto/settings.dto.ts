import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

export const NOTIFICATION_CHANNELS = [
  "push",
  "sms",
  "email",
  "in_app",
] as const;

export class NotificationPreferenceDto {
  @ApiProperty({ enum: NOTIFICATION_CHANNELS })
  @IsIn(NOTIFICATION_CHANNELS)
  channel!: (typeof NOTIFICATION_CHANNELS)[number];

  @ApiProperty({ example: "messages" })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  category!: string;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ type: [NotificationPreferenceDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceDto)
  preferences!: NotificationPreferenceDto[];
}

export class CreateDataRequestDto {
  @ApiProperty({ enum: ["export", "deletion"] })
  @IsIn(["export", "deletion"])
  type!: "export" | "deletion";
}
