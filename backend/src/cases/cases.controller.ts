import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { AuthenticatedUser, CurrentUser } from "../auth/authenticated-user.decorator";
import { RequirePermission } from "../rbac/permission.guard";
import { CasesService } from "./cases.service";
import { CreateAppealDto, CreateReportDto, DecideAppealDto, OpenCaseDto, UpdateCaseDto } from "./dto/case.dto";

@Controller()
@UseGuards(AccessTokenGuard)
@ApiBearerAuth()
@ApiTags("Cases")
export class CasesController {
  constructor(private readonly cases: CasesService) {}

  @Post("reports")
  report(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateReportDto) { return this.cases.report(user, body); }

  @Get("me/reports")
  myReports(@CurrentUser() user: AuthenticatedUser) { return this.cases.myReports(user); }

  @Get("me/cases")
  myCases(@CurrentUser() user: AuthenticatedUser) { return this.cases.myCases(user); }

  @Get("cases/:caseId")
  get(@CurrentUser() user: AuthenticatedUser, @Param("caseId", ParseUUIDPipe) id: string) { return this.cases.getForUser(user, id); }

  @Post("cases/:caseId/appeals")
  appeal(@CurrentUser() user: AuthenticatedUser, @Param("caseId", ParseUUIDPipe) id: string, @Body() body: CreateAppealDto) {
    return this.cases.appeal(user, id, body.reason);
  }
}

@Controller("admin")
@ApiTags("Admin: cases")
export class AdminCasesController {
  constructor(private readonly cases: CasesService) {}

  @Get("reports") @RequirePermission("cases.manage")
  reports() { return this.cases.reportQueue(); }

  @Post("reports/:reportId/case") @RequirePermission("cases.manage")
  open(@CurrentUser() actor: AuthenticatedUser, @Param("reportId", ParseUUIDPipe) id: string, @Body() body: OpenCaseDto) {
    return this.cases.open(actor, id, body);
  }

  @Get("cases") @RequirePermission("cases.manage")
  queue() { return this.cases.queue(); }

  @Get("cases/:caseId") @RequirePermission("cases.manage")
  get(@Param("caseId", ParseUUIDPipe) id: string) { return this.cases.getForAdmin(id); }

  @Patch("cases/:caseId") @RequirePermission("cases.manage")
  update(@CurrentUser() actor: AuthenticatedUser, @Param("caseId", ParseUUIDPipe) id: string, @Body() body: UpdateCaseDto) {
    return this.cases.update(actor, id, body);
  }

  @Get("appeals") @RequirePermission("cases.manage")
  appeals() { return this.cases.appealQueue(); }

  @Post("appeals/:appealId/decision") @RequirePermission("cases.manage")
  decideAppeal(@CurrentUser() actor: AuthenticatedUser, @Param("appealId", ParseUUIDPipe) id: string, @Body() body: DecideAppealDto) {
    return this.cases.decideAppeal(actor, id, body);
  }
}
