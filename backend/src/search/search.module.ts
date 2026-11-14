import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DiscoverModule } from "../discover/discover.module";
import { OptionalAccessTokenGuard } from "./optional-access-token.guard";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [AuthModule, DiscoverModule],
  controllers: [SearchController],
  providers: [SearchService, OptionalAccessTokenGuard],
})
export class SearchModule {}
