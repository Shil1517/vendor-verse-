import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PermissionGuard } from "../rbac/permission.guard";
import { AdminAgentsController, AgentsController } from "./agents.controller";
import { AgentsService } from "./agents.service";

@Module({ imports: [AuthModule], controllers: [AgentsController, AdminAgentsController], providers: [AgentsService, PermissionGuard] })
export class AgentsModule {}
