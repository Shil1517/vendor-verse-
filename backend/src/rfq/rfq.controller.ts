import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AccessTokenGuard } from "../auth/access-token.guard";
import {
  AuthenticatedUser,
  CurrentUser,
} from "../auth/authenticated-user.decorator";
import {
  CreateQuoteDto,
  CreateRfqDto,
  ExtendRfqDeadlineDto,
  OpenRfqDto,
  QuoteRevisionDto,
  ReviseRfqDto,
} from "./dto/rfq.dto";
import { WorkOrderActionDto } from "./dto/work-order.dto";
import { RfqService } from "./rfq.service";

@Controller()
@UseGuards(AccessTokenGuard)
@ApiTags("RFQs and quotes")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Access token is invalid or expired." })
export class RfqController {
  constructor(private readonly rfqs: RfqService) {}

  @Post("rfqs")
  @ApiOperation({ summary: "Create an RFQ draft (F-RFQ-01)" })
  @ApiCreatedResponse({ description: "The created RFQ draft." })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: CreateRfqDto,
  ) {
    return this.rfqs.create(user, request);
  }

  @Get("me/rfqs")
  @ApiOperation({ summary: "List RFQs created by the signed-in customer" })
  @ApiOkResponse({ description: "The caller's RFQs." })
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.rfqs.listMine(user);
  }

  @Get("vendors/:vendorId/rfqs")
  @ApiOperation({ summary: "List RFQs delivered to an owned vendor" })
  @ApiNotFoundResponse({ description: "No such vendor for this user." })
  listForVendor(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
  ) {
    return this.rfqs.listForVendor(user, vendorId);
  }

  @Get("rfqs/:rfqId")
  @ApiOperation({ summary: "Get an RFQ as its customer or invited vendor" })
  @ApiNotFoundResponse({ description: "No such RFQ for this user." })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param("rfqId", ParseUUIDPipe) rfqId: string,
  ) {
    return this.rfqs.get(user, rfqId);
  }

  @Post("rfqs/:rfqId/open")
  @ApiOperation({
    summary: "Open an RFQ and deliver it to eligible vendors",
    description:
      "The requester supplies the quote deadline; no deadline is invented by the API.",
  })
  @ApiConflictResponse({ description: "Only a draft RFQ can be opened." })
  open(
    @CurrentUser() user: AuthenticatedUser,
    @Param("rfqId", ParseUUIDPipe) rfqId: string,
    @Body() request: OpenRfqDto,
  ) {
    return this.rfqs.open(user, rfqId, request);
  }

  @Post("rfqs/:rfqId/revisions")
  @ApiOperation({ summary: "Create an RFQ revision while it remains editable" })
  revise(
    @CurrentUser() user: AuthenticatedUser,
    @Param("rfqId", ParseUUIDPipe) rfqId: string,
    @Body() request: ReviseRfqDto,
  ) {
    return this.rfqs.revise(user, rfqId, request);
  }

  @Post("rfqs/:rfqId/extend-deadline")
  @ApiOperation({ summary: "Extend an open RFQ's quote deadline" })
  extendDeadline(
    @CurrentUser() user: AuthenticatedUser,
    @Param("rfqId", ParseUUIDPipe) rfqId: string,
    @Body() request: ExtendRfqDeadlineDto,
  ) {
    return this.rfqs.extendDeadline(user, rfqId, request.quoteDeadlineAt);
  }

  @Get("rfqs/:rfqId/quotes")
  @ApiOperation({
    summary: "List quotes for the customer or the vendor's own quote",
  })
  listQuotes(
    @CurrentUser() user: AuthenticatedUser,
    @Param("rfqId", ParseUUIDPipe) rfqId: string,
  ) {
    return this.rfqs.listQuotes(user, rfqId);
  }

  @Post("rfqs/:rfqId/quotes")
  @ApiOperation({ summary: "Submit a quote for an invited vendor" })
  @ApiCreatedResponse({ description: "The submitted quote." })
  submitQuote(
    @CurrentUser() user: AuthenticatedUser,
    @Param("rfqId", ParseUUIDPipe) rfqId: string,
    @Body() request: CreateQuoteDto,
  ) {
    return this.rfqs.submitQuote(user, rfqId, request);
  }

  @Post("quotes/:quoteId/revisions")
  @ApiOperation({ summary: "Revise a submitted quote" })
  reviseQuote(
    @CurrentUser() user: AuthenticatedUser,
    @Param("quoteId", ParseUUIDPipe) quoteId: string,
    @Body() request: QuoteRevisionDto,
  ) {
    return this.rfqs.reviseQuote(user, quoteId, request);
  }

  @Post("quotes/:quoteId/withdraw")
  @ApiOperation({ summary: "Withdraw a submitted quote" })
  withdrawQuote(
    @CurrentUser() user: AuthenticatedUser,
    @Param("quoteId", ParseUUIDPipe) quoteId: string,
  ) {
    return this.rfqs.withdrawQuote(user, quoteId);
  }

  @Post("rfqs/:rfqId/quotes/:quoteId/accept")
  @ApiOperation({
    summary: "Accept exactly one quote and snapshot its terms (F-RFQ-03/04)",
  })
  acceptQuote(
    @CurrentUser() user: AuthenticatedUser,
    @Param("rfqId", ParseUUIDPipe) rfqId: string,
    @Param("quoteId", ParseUUIDPipe) quoteId: string,
  ) {
    return this.rfqs.acceptQuote(user, rfqId, quoteId);
  }

  @Post("rfqs/:rfqId/expire")
  @ApiOperation({ summary: "Expire an open RFQ after its deadline" })
  expire(
    @CurrentUser() user: AuthenticatedUser,
    @Param("rfqId", ParseUUIDPipe) rfqId: string,
  ) {
    return this.rfqs.expire(user, rfqId);
  }

  @Get("rfqs/:rfqId/vendor-suggestions")
  @ApiOperation({ summary: "List eligible, uninvited vendors after an RFQ expires without quotes" })
  vendorSuggestions(
    @CurrentUser() user: AuthenticatedUser,
    @Param("rfqId", ParseUUIDPipe) rfqId: string,
  ) {
    return this.rfqs.vendorSuggestions(user, rfqId);
  }

  @Get("me/work-orders")
  @ApiOperation({ summary: "List work orders for the caller" })
  listWorkOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.rfqs.listWorkOrders(user);
  }

  @Get("vendors/:vendorId/work-orders")
  listWorkOrdersForVendor(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
  ) {
    return this.rfqs.listWorkOrdersForVendor(user, vendorId);
  }

  @Get("work-orders/:workOrderId")
  getWorkOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param("workOrderId", ParseUUIDPipe) workOrderId: string,
  ) {
    return this.rfqs.getWorkOrder(user, workOrderId);
  }

  @Post("work-orders/:workOrderId/actions")
  actWorkOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param("workOrderId", ParseUUIDPipe) workOrderId: string,
    @Body() request: WorkOrderActionDto,
  ) {
    return this.rfqs.actWorkOrder(user, workOrderId, request);
  }
}
