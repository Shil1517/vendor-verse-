import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { AuthenticatedUser, CurrentUser } from "../auth/authenticated-user.decorator";
import { RequirePermission } from "../rbac/permission.guard";
import { InvoicesService } from "./invoices.service";

@Controller("vendors/:vendorId/invoices")
@UseGuards(AccessTokenGuard)
@ApiBearerAuth()
@ApiTags("Invoices")
export class VendorInvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param("vendorId", ParseUUIDPipe) vendorId: string) {
    return this.invoices.listOwn(user, vendorId);
  }

  @Get(":invoiceId")
  get(@CurrentUser() user: AuthenticatedUser, @Param("vendorId", ParseUUIDPipe) vendorId: string,
    @Param("invoiceId", ParseUUIDPipe) invoiceId: string) {
    return this.invoices.getOwn(user, vendorId, invoiceId);
  }
}

@Controller("admin/invoices")
@ApiTags("Admin: invoices")
export class AdminInvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get() @RequirePermission("invoices.read")
  list() { return this.invoices.adminList(); }

  @Get(":invoiceId") @RequirePermission("invoices.read")
  get(@Param("invoiceId", ParseUUIDPipe) invoiceId: string) { return this.invoices.adminGet(invoiceId); }
}
