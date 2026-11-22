import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PermissionGuard } from "../rbac/permission.guard";
import { AdminTaxonomyController } from "./admin-taxonomy.controller";
import { AdminTaxonomyService } from "./admin-taxonomy.service";
import { TaxonomyController } from "./taxonomy.controller";
import { TaxonomyService } from "./taxonomy.service";
import { AdminCategorySuggestionsController, CategorySuggestionsController } from "./category-suggestions.controller";
import { CategorySuggestionsService } from "./category-suggestions.service";

@Module({
  imports: [AuthModule],
  controllers: [TaxonomyController, AdminTaxonomyController, CategorySuggestionsController, AdminCategorySuggestionsController],
  providers: [TaxonomyService, AdminTaxonomyService, CategorySuggestionsService, PermissionGuard],
})
export class TaxonomyModule {}
