import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccountsModule } from "./accounts/accounts.module";
import { AdminModule } from "./admin/admin.module";
import { AgentsModule } from "./agents/agents.module";
import { AuthModule } from "./auth/auth.module";
import { BookingsModule } from "./bookings/bookings.module";
import { CasesModule } from "./cases/cases.module";
import { ContractsModule } from "./contracts/contracts.module";
import { DatabaseModule } from "./database/database.module";
import { DiscoverModule } from "./discover/discover.module";
import { FilesModule } from "./files/files.module";
import { GeoModule } from "./geo/geo.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { ListingsModule } from "./listings/listings.module";
import { MessagesModule } from "./messages/messages.module";
import { PaymentRecordsModule } from "./payments/payment-records.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { HealthController } from "./health/health.controller";
import { PlatformModule } from "./platform/platform.module";
import { RbacModule } from "./rbac/rbac.module";
import { RemoteBookingsModule } from "./remote-bookings/remote-bookings.module";
import { SearchModule } from "./search/search.module";
import { SponsoredModule } from "./sponsored/sponsored.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
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
    AdminModule,
    AgentsModule,
    BookingsModule,
    CasesModule,
    ContractsModule,
    PurchaseOrdersModule,
    RbacModule,
    RfqModule,
    GeoModule,
    InvoicesModule,
    TaxonomyModule,
    VendorsModule,
    VendorRolesModule,
    ListingsModule,
    MessagesModule,
    PaymentRecordsModule,
    ReviewsModule,
    NotificationsModule,
    FilesModule,
    VerificationModule,
    DiscoverModule,
    RemoteBookingsModule,
    SearchModule,
    SponsoredModule,
    SubscriptionsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
