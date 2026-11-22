import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser, CurrentUser } from "../auth/authenticated-user.decorator";
import { RequirePermission } from "../rbac/permission.guard";
import { AgentsService } from "./agents.service";
import { AddLeadActivityDto, CreateLeadDto, UpdateLeadDto } from "./dto/agent.dto";

@Controller("agent")
@ApiTags("Sales agents")
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}

  @Get("leads") @RequirePermission("agent.leads")
  list(@CurrentUser() user: AuthenticatedUser) { return this.agents.list(user); }

  @Post("leads") @RequirePermission("agent.leads")
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateLeadDto) { return this.agents.create(user, body); }

  @Get("leads/:leadId") @RequirePermission("agent.leads")
  get(@CurrentUser() user: AuthenticatedUser, @Param("leadId", ParseUUIDPipe) id: string) { return this.agents.get(user, id); }

  @Patch("leads/:leadId") @RequirePermission("agent.leads")
  update(@CurrentUser() user: AuthenticatedUser, @Param("leadId", ParseUUIDPipe) id: string, @Body() body: UpdateLeadDto) {
    return this.agents.update(user, id, body);
  }

  @Post("leads/:leadId/activities") @RequirePermission("agent.leads")
  activity(@CurrentUser() user: AuthenticatedUser, @Param("leadId", ParseUUIDPipe) id: string, @Body() body: AddLeadActivityDto) {
    return this.agents.activity(user, id, body);
  }

  @Get("performance") @RequirePermission("agent.leads")
  performance(@CurrentUser() user: AuthenticatedUser) { return this.agents.performance(user); }
}

@Controller("admin/agents")
@ApiTags("Admin: sales agents")
export class AdminAgentsController {
  constructor(private readonly agents: AgentsService) {}

  @Get("leads") @RequirePermission("agent.oversee")
  leads() { return this.agents.adminLeads(); }
}
