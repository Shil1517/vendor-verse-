import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PermissionGuard } from "../rbac/permission.guard";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({ imports: [AuthModule], controllers: [AdminController], providers: [AdminService, PermissionGuard] })
export class AdminModule {}
