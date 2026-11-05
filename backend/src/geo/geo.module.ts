import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { GeoController } from "./geo.controller";
import { GeoService } from "./geo.service";
import { WaitlistController } from "./waitlist.controller";
import { WaitlistService } from "./waitlist.service";

@Module({
  imports: [AuthModule],
  controllers: [GeoController, WaitlistController],
  providers: [GeoService, WaitlistService],
  exports: [GeoService],
})
export class GeoModule {}
