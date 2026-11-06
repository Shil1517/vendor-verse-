import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

/** Roles an administrator may assign. CUSTOMER and VENDOR are system-managed. */
export const ASSIGNABLE_ROLES = ["SALES_AGENT", "SUPER_ADMIN"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class GrantRoleDto {
  @ApiProperty({ enum: ASSIGNABLE_ROLES })
  @IsIn(ASSIGNABLE_ROLES)
  roleCode!: AssignableRole;

  @ApiProperty({ description: "Why the role is being granted. Audited." })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}

export class RevokeRoleDto {
  @ApiProperty({ description: "Why the role is being revoked. Audited." })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}
