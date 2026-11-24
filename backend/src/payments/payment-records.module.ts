import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PaymentRecordsController } from "./payment-records.controller";
import { PaymentRecordsService } from "./payment-records.service";

@Module({
  imports: [AuthModule],
  controllers: [PaymentRecordsController],
  providers: [PaymentRecordsService],
})
export class PaymentRecordsModule {}
