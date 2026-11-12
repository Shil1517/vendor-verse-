import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ServiceAreasController } from "./service-areas.controller";
import { ServiceAreasService } from "./service-areas.service";
import {
  PublicVendorsController,
  VendorsController,
} from "./vendors.controller";
import { VendorsService } from "./vendors.service";

@Module({
  imports: [AuthModule],
  controllers: [PublicVendorsController, VendorsController, ServiceAreasController],
  providers: [VendorsService, ServiceAreasService],
})
export class VendorsModule {}
