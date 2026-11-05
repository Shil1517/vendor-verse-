import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccountsModule } from "./accounts/accounts.module";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { HealthController } from "./health/health.controller";
import { TaxonomyModule } from "./taxonomy/taxonomy.module";
import { validateEnvironment } from "./config/environment";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    DatabaseModule,
    AuthModule,
    AccountsModule,
    TaxonomyModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
