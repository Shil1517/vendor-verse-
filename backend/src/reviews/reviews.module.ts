import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PublicVendorReviewsController, ReviewsController } from "./reviews.controller";
import { ReviewsService } from "./reviews.service";

@Module({ imports: [AuthModule, NotificationsModule], controllers: [ReviewsController, PublicVendorReviewsController], providers: [ReviewsService] })
export class ReviewsModule {}
