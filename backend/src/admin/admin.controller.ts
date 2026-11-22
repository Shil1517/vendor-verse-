import { Body, Controller, Get, Param, Patch, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser, CurrentUser } from "../auth/authenticated-user.decorator";
import { RequirePermission } from "../rbac/permission.guard";
import { AdminService } from "./admin.service";
import { AuditQueryDto, DecideConfigDto, SetPlatformSettingDto } from "./dto/admin.dto";

@Controller("admin")
@ApiTags("Admin operations")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("dashboard") @RequirePermission("admin.dashboard")
  dashboard() { return this.admin.dashboard(); }

  @Get("audit") @RequirePermission("audit.read")
  audit(@Query() query: AuditQueryDto) { return this.admin.audit(query); }

  @Get("config") @RequirePermission("admin.configure")
  config() { return this.admin.config(); }

  @Get("config/:code") @RequirePermission("admin.configure")
  configItem(@Param("code") code: string) { return this.admin.configItem(code); }

  @Patch("config/:code") @RequirePermission("admin.configure")
  decideConfig(@CurrentUser() actor: AuthenticatedUser, @Param("code") code: string, @Body() body: DecideConfigDto) {
    return this.admin.decideConfig(actor, code, body);
  }

  @Get("settings") @RequirePermission("admin.configure")
  settings() { return this.admin.settings(); }

  @Get("settings/:key") @RequirePermission("admin.configure")
  setting(@Param("key") key: string) { return this.admin.setting(key); }

  @Put("settings/:key") @RequirePermission("admin.configure")
  putSetting(@CurrentUser() actor: AuthenticatedUser, @Param("key") key: string, @Body() body: SetPlatformSettingDto) {
    return this.admin.putSetting(actor, key, body);
  }
}
