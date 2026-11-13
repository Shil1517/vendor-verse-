import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import {
  DiscoverController,
  FavoritesController,
} from "./discover.controller";
import { DiscoverService } from "./discover.service";
import { FavoritesService } from "./favorites.service";

@Module({
  imports: [AuthModule],
  controllers: [DiscoverController, FavoritesController],
  providers: [DiscoverService, FavoritesService],
  exports: [DiscoverService],
})
export class DiscoverModule {}
