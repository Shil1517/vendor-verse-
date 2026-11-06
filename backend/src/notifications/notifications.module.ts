import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationDispatchHandler } from "./notification-dispatch.handler";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationDispatchHandler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
