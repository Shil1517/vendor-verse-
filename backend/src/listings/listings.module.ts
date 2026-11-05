import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AvailabilityService } from "./availability.service";
import { ListingsController } from "./listings.controller";
import { ListingsService } from "./listings.service";
import { PublicationGatesService } from "./publication-gates.service";

@Module({
  imports: [AuthModule],
  controllers: [ListingsController],
  providers: [ListingsService, AvailabilityService, PublicationGatesService],
})
export class ListingsModule {}
