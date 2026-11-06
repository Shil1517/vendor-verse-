import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PermissionGuard } from "../rbac/permission.guard";
import { AdminTaxonomyController } from "./admin-taxonomy.controller";
import { AdminTaxonomyService } from "./admin-taxonomy.service";
import { TaxonomyController } from "./taxonomy.controller";
import { TaxonomyService } from "./taxonomy.service";

@Module({
  imports: [AuthModule],
  controllers: [TaxonomyController, AdminTaxonomyController],
  providers: [TaxonomyService, AdminTaxonomyService, PermissionGuard],
})
export class TaxonomyModule {}
