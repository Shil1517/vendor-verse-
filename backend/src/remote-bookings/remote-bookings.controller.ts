import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
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
import { RemoteBookingsService } from "./remote-bookings.service";
import {
  CancelRemoteBookingDto,
  CreateRemoteBookingDto,
  DeclineRemoteBookingDto,
  ListRemoteBookingsQueryDto,
  ProposeRemoteModificationDto,
} from "./dto/remote-booking.dto";

@Controller()
@UseGuards(AccessTokenGuard)
@ApiTags("Remote bookings")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Access token is invalid or expired." })
@ApiNotFoundResponse({ description: "No such booking for this user." })
export class RemoteBookingsController {
  constructor(private readonly bookings: RemoteBookingsService) {}

  @Post("remote-bookings")
  @ApiOperation({
    summary: "Create a booking (F-BKG-01, F-BKG-02, F-BKG-03, F-BKG-08)",
    description:
      "Scheduled bookings start as requested. Instant bookings (listings with instant booking on) reserve capacity atomically and start confirmed. A recurrence creates linked occurrences. Send an Idempotency-Key: a double tap or retry returns the same booking(s). Terms and policy are snapshotted.",
  })
  @ApiHeader({ name: "Idempotency-Key", required: false })
  @ApiCreatedResponse({
    description: "The booking, or every occurrence of a series.",
  })
  @ApiBadRequestResponse({ description: "Validation failed." })
  @ApiConflictResponse({
    description: "The instant slot is no longer available.",
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: CreateRemoteBookingDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.bookings.create(
      user,
      request,
      idempotencyKey?.trim() || undefined,
    );
  }

  @Get("remote-bookings")
  @ApiOperation({ summary: "My bookings as a customer (F-BKG-10)" })
  @ApiOkResponse({ description: "Newest first." })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListRemoteBookingsQueryDto,
  ) {
    return { bookings: await this.bookings.listForCustomer(user, query.state) };
  }

  @Get("vendors/:vendorId/remote-bookings")
  @ApiOperation({
    summary: "Vendor booking inbox (F-BKG-09)",
    description:
      "Only this vendor's bookings; competing requests are never visible.",
  })
  async listForVendor(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
    @Query() query: ListRemoteBookingsQueryDto,
  ) {
    return {
      bookings: await this.bookings.listForVendor(user, vendorId, query.state),
    };
  }

  @Get("remote-bookings/:bookingId")
  @ApiOperation({
    summary: "Booking detail with history, terms snapshot and conflicts",
    description:
      "conflictingBookingIds lists the customer's overlapping bookings; nothing is auto-cancelled (F-BKG-07).",
  })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
  ) {
    return this.bookings.get(user, bookingId);
  }

  @Post("remote-bookings/:bookingId/accept")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Vendor accepts a requested booking" })
  @ApiForbiddenResponse({ description: "Only the vendor can do this." })
  @ApiConflictResponse({
    description: "The booking is not in a state that allows it.",
  })
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
  ) {
    return this.bookings.transition(user, bookingId, "accept");
  }

  @Post("remote-bookings/:bookingId/decline")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Vendor declines a requested booking" })
  decline(
    @CurrentUser() user: AuthenticatedUser,
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
    @Body() request: DeclineRemoteBookingDto,
  ) {
    return this.bookings.decline(user, bookingId, request);
  }

  @Post("remote-bookings/:bookingId/start")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Vendor marks a confirmed booking in progress" })
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
  ) {
    return this.bookings.transition(user, bookingId, "start");
  }

  @Post("remote-bookings/:bookingId/complete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Vendor marks the work complete (F-BKG-06)",
    description:
      "The customer then has 7 days to confirm or report; silence closes the booking.",
  })
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
  ) {
    return this.bookings.transition(user, bookingId, "complete");
  }

  @Post("remote-bookings/:bookingId/confirm")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Customer confirms completion and closes the booking",
  })
  confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
  ) {
    return this.bookings.transition(user, bookingId, "confirm");
  }

  @Post("remote-bookings/:bookingId/cancel")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Cancel, by customer or vendor (F-BKG-05)",
    description:
      "No automatic penalty; the outcome is recorded. cancelSeries (customer, series bookings) also cancels later open occurrences (D-011).",
  })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
    @Body() request: CancelRemoteBookingDto,
  ) {
    return this.bookings.cancel(user, bookingId, request);
  }

  @Post("remote-bookings/:bookingId/modifications")
  @ApiOperation({
    summary: "Propose a change (F-BKG-04)",
    description:
      "The original terms stay in force until the other side accepts.",
  })
  @ApiCreatedResponse({ description: "The booking with its open proposal." })
  propose(
    @CurrentUser() user: AuthenticatedUser,
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
    @Body() request: ProposeRemoteModificationDto,
  ) {
    return this.bookings.proposeModification(user, bookingId, request);
  }

  @Post("remote-bookings/:bookingId/modifications/:modificationId/accept")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Accept the other side's proposal; the terms change now",
  })
  acceptModification(
    @CurrentUser() user: AuthenticatedUser,
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
    @Param("modificationId", ParseUUIDPipe) modificationId: string,
  ) {
    return this.bookings.decideModification(
      user,
      bookingId,
      modificationId,
      "accepted",
    );
  }

  @Post("remote-bookings/:bookingId/modifications/:modificationId/decline")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Decline the other side's proposal; the original terms stand",
  })
  declineModification(
    @CurrentUser() user: AuthenticatedUser,
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
    @Param("modificationId", ParseUUIDPipe) modificationId: string,
  ) {
    return this.bookings.decideModification(
      user,
      bookingId,
      modificationId,
      "declined",
    );
  }

  @Post("remote-bookings/:bookingId/modifications/:modificationId/withdraw")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Withdraw your own proposal" })
  withdrawModification(
    @CurrentUser() user: AuthenticatedUser,
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
    @Param("modificationId", ParseUUIDPipe) modificationId: string,
  ) {
    return this.bookings.decideModification(
      user,
      bookingId,
      modificationId,
      "withdrawn",
    );
  }
}
