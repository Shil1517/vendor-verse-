import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { RemoteBookingsController } from "./remote-bookings.controller";
import { RemoteBookingsService } from "./remote-bookings.service";

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [RemoteBookingsController],
  providers: [RemoteBookingsService],
})
export class RemoteBookingsModule {}
