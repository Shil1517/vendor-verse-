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
  ApiNotFoundResponse,
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
  OpenPurchaseOrderDisputeDto,
  PurchaseOrderActionDto,
  ResolvePurchaseOrderDisputeDto,
} from "./dto/purchase-order.dto";
import { PurchaseOrdersService } from "./purchase-orders.service";

@Controller()
@UseGuards(AccessTokenGuard)
@ApiTags("Purchase orders")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Access token is invalid or expired." })
export class PurchaseOrdersController {
  constructor(private readonly orders: PurchaseOrdersService) {}

  @Get("me/purchase-orders")
  @ApiOperation({ summary: "List purchase orders for the caller" })
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.orders.listMine(user);
  }

  @Get("vendors/:vendorId/purchase-orders")
  @ApiOperation({ summary: "List purchase orders for an owned buyer or supplier vendor" })
  listForVendor(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
  ) {
    return this.orders.listForVendor(user, vendorId);
  }

  @Get("purchase-orders/:orderId")
  @ApiNotFoundResponse({ description: "No such purchase order for this user." })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId", ParseUUIDPipe) orderId: string,
  ) {
    return this.orders.get(user, orderId);
  }

  @Post("purchase-orders/:orderId/actions")
  @ApiOperation({ summary: "Apply a permitted purchase-order lifecycle action (F-GDS-03/04)" })
  act(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @Body() request: PurchaseOrderActionDto,
  ) {
    return this.orders.act(user, orderId, request);
  }

  @Post("purchase-orders/:orderId/disputes")
  @ApiOperation({ summary: "Link an existing support case to this purchase order (F-GDS-06)" })
  openDispute(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @Body() request: OpenPurchaseOrderDisputeDto,
  ) {
    return this.orders.openDispute(user, orderId, request);
  }

  @Post("purchase-order-disputes/:disputeId/resolve")
  @ApiOperation({ summary: "Record the agreed dispute outcome; no funds move on platform" })
  resolveDispute(
    @CurrentUser() user: AuthenticatedUser,
    @Param("disputeId", ParseUUIDPipe) disputeId: string,
    @Body() request: ResolvePurchaseOrderDisputeDto,
  ) {
    return this.orders.resolveDispute(user, disputeId, request);
  }
}
