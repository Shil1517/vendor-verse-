import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AccountsController } from "./accounts.controller";
import { AccountsService } from "./accounts.service";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";

@Module({
  imports: [AuthModule],
  controllers: [AccountsController, ProfileController, SettingsController],
  providers: [AccountsService, ProfileService, SettingsService],
})
export class AccountsModule {}
