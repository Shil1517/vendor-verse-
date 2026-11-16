import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FilesModule } from "../files/files.module";
import { RbacModule } from "../rbac/rbac.module";
import { AvailabilityService } from "./availability.service";
import { AdminListingReviewController } from "./listing-review.controller";
import { ListingReviewService } from "./listing-review.service";
import { ListingsController } from "./listings.controller";
import { ListingsService } from "./listings.service";
import { PublicationGatesService } from "./publication-gates.service";

@Module({
  imports: [AuthModule, FilesModule, RbacModule],
  controllers: [ListingsController, AdminListingReviewController],
  providers: [
    ListingsService,
    ListingReviewService,
    AvailabilityService,
    PublicationGatesService,
  ],
})
export class ListingsModule {}
