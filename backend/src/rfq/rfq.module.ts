import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BookingsModule } from "../bookings/bookings.module";
import { ContractsModule } from "../contracts/contracts.module";
import { FilesModule } from "../files/files.module";
import { PurchaseOrdersModule } from "../orders/purchase-orders.module";
import { RfqController } from "./rfq.controller";
import { RfqService } from "./rfq.service";

@Module({
  imports: [AuthModule, BookingsModule, ContractsModule, FilesModule, PurchaseOrdersModule],
  controllers: [RfqController],
  providers: [RfqService],
  exports: [RfqService],
})
export class RfqModule {}
