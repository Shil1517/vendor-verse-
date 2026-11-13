import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccountsModule } from "./accounts/accounts.module";
import { AuthModule } from "./auth/auth.module";
import { BookingsModule } from "./bookings/bookings.module";
import { ContractsModule } from "./contracts/contracts.module";
import { DatabaseModule } from "./database/database.module";
import { FilesModule } from "./files/files.module";
import { GeoModule } from "./geo/geo.module";
import { ListingsModule } from "./listings/listings.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { HealthController } from "./health/health.controller";
import { PlatformModule } from "./platform/platform.module";
import { RbacModule } from "./rbac/rbac.module";
import { RfqModule } from "./rfq/rfq.module";
import { PurchaseOrdersModule } from "./orders/purchase-orders.module";
import { TaxonomyModule } from "./taxonomy/taxonomy.module";
import { VendorRolesModule } from "./vendor-roles/vendor-roles.module";
import { VendorsModule } from "./vendors/vendors.module";
import { VerificationModule } from "./verification/verification.module";
import { validateEnvironment } from "./config/environment";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    DatabaseModule,
    PlatformModule,
    AuthModule,
    AccountsModule,
    BookingsModule,
    ContractsModule,
    PurchaseOrdersModule,
    RbacModule,
    RfqModule,
    GeoModule,
    TaxonomyModule,
    VendorsModule,
    VendorRolesModule,
    ListingsModule,
    NotificationsModule,
    FilesModule,
    VerificationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
