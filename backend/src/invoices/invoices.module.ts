import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PermissionGuard } from "../rbac/permission.guard";
import { AdminInvoicesController, VendorInvoicesController } from "./invoices.controller";
import { InvoicesService } from "./invoices.service";

@Module({ imports: [AuthModule], controllers: [VendorInvoicesController, AdminInvoicesController],
  providers: [InvoicesService, PermissionGuard] })
export class InvoicesModule {}
