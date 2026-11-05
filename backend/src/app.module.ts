import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccountsModule } from "./accounts/accounts.module";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { GeoModule } from "./geo/geo.module";
import { ListingsModule } from "./listings/listings.module";
import { HealthController } from "./health/health.controller";
import { PlatformModule } from "./platform/platform.module";
import { TaxonomyModule } from "./taxonomy/taxonomy.module";
import { VendorsModule } from "./vendors/vendors.module";
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
    GeoModule,
    TaxonomyModule,
    VendorsModule,
    ListingsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
