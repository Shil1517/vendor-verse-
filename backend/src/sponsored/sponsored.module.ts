import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PermissionGuard } from "../rbac/permission.guard";
import { AdminSponsoredController, VendorSponsoredController } from "./sponsored.controller";
import { SponsoredService } from "./sponsored.service";

@Module({ imports: [AuthModule], controllers: [VendorSponsoredController, AdminSponsoredController],
  providers: [SponsoredService, PermissionGuard] })
export class SponsoredModule {}
