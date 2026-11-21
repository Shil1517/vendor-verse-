import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, Length } from "class-validator";
import { Transform } from "class-transformer";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class StartConversationDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  vendorId!: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  listingId?: string;
}

export class SendMessageDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(1, 4000)
  body!: string;
}
