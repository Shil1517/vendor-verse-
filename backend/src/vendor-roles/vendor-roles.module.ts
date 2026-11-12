import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RbacModule } from "../rbac/rbac.module";
import {
  AdminVendorRoleDefinitionsController,
  AdminVendorRoleReviewController,
  VendorRoleCatalogueController,
  VendorRolesController,
} from "./vendor-roles.controller";
import { VendorRolesService } from "./vendor-roles.service";

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [
    VendorRoleCatalogueController,
    AdminVendorRoleDefinitionsController,
    VendorRolesController,
    AdminVendorRoleReviewController,
  ],
  providers: [VendorRolesService],
})
export class VendorRolesModule {}
