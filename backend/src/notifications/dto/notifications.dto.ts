import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  Max,
  Min,
} from "class-validator";
import { INBOX_MAX_LIMIT } from "../notifications.service";

export class ListNotificationsQuery {
  @ApiPropertyOptional({ description: "Only unread notifications." })
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ maximum: INBOX_MAX_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(INBOX_MAX_LIMIT)
  limit?: number;

  @ApiPropertyOptional({
    description: "Return items older than this createdAt (paging cursor).",
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  before?: Date;
}
