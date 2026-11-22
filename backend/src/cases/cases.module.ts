import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PermissionGuard } from "../rbac/permission.guard";
import { AdminCasesController, CasesController } from "./cases.controller";
import { CasesService } from "./cases.service";

@Module({ imports: [AuthModule], controllers: [CasesController, AdminCasesController], providers: [CasesService, PermissionGuard] })
export class CasesModule {}
