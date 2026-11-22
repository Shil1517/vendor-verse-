import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PermissionGuard } from "../rbac/permission.guard";
import { AdminSubscriptionsController, PlansController, VendorSubscriptionsController } from "./subscriptions.controller";
import { SubscriptionsService } from "./subscriptions.service";

@Module({ imports: [AuthModule], controllers: [PlansController, VendorSubscriptionsController, AdminSubscriptionsController], providers: [SubscriptionsService, PermissionGuard] })
export class SubscriptionsModule {}
