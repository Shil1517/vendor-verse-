import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PermissionGuard } from "./permission.guard";
import { RbacController } from "./rbac.controller";
import { RbacService } from "./rbac.service";

@Module({
  imports: [AuthModule],
  controllers: [RbacController],
  providers: [RbacService, PermissionGuard],
  exports: [PermissionGuard],
})
export class RbacModule {}
