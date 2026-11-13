import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
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
  BookingActionDto,
  CancelBookingDto,
  CreateBookingDto,
  CreateBookingSeriesDto,
  DecideBookingModificationDto,
  ProposeBookingModificationDto,
  ReportBookingCompletionDto,
  ResolveBookingConflictsDto,
} from "./dto/booking.dto";
import { BookingsService } from "./bookings.service";

@Controller()
@UseGuards(AccessTokenGuard)
@ApiTags("Bookings")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Access token is invalid or expired." })
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post("bookings")
  @ApiOperation({ summary: "Create an instant or scheduled booking (F-BKG-01/02/08)" })
  @ApiCreatedResponse({ description: "The created booking." })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Headers("idempotency-key") key: string | undefined,
    @Body() request: CreateBookingDto,
  ) {
    return this.bookings.create(user, request, key);
  }

  @Post("booking-series")
  @ApiOperation({ summary: "Create a recurring series of independent booking occurrences (F-BKG-03)" })
  createSeries(
    @CurrentUser() user: AuthenticatedUser,
    @Headers("idempotency-key") key: string | undefined,
    @Body() request: CreateBookingSeriesDto,
  ) {
    return this.bookings.createSeries(user, request, key);
  }

  @Get("me/bookings")
  @ApiOperation({ summary: "List the caller's bookings" })
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.bookings.listMine(user);
  }

  @Get("vendors/:vendorId/bookings")
  @ApiOperation({ summary: "List bookings delivered to an owned vendor (F-BKG-09)" })
  listForVendor(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
  ) {
    return this.bookings.listForVendor(user, vendorId);
  }

  @Get("bookings/:bookingId")
  @ApiNotFoundResponse({ description: "No such booking for this user." })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
  ) {
    return this.bookings.get(user, bookingId);
  }

  @Get("bookings/:bookingId/events")
  events(
    @CurrentUser() user: AuthenticatedUser,
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
  ) {
    return this.bookings.events(user, bookingId);
  }

  @Post("bookings/:bookingId/actions")
  act(
    @CurrentUser() user: AuthenticatedUser,
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
    @Body() request: BookingActionDto,
  ) {
    return this.bookings.act(user, bookingId, request);
  }

  @Post("bookings/:bookingId/cancel")
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
    @Body() request: CancelBookingDto,
  ) {
    return this.bookings.cancel(user, bookingId, request);
  }

  @Post("bookings/:bookingId/modifications")
  proposeModification(
    @CurrentUser() user: AuthenticatedUser,
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
    @Body() request: ProposeBookingModificationDto,
  ) {
    return this.bookings.proposeModification(user, bookingId, request);
  }

  @Post("booking-modifications/:modificationId/decision")
  decideModification(
    @CurrentUser() user: AuthenticatedUser,
    @Param("modificationId", ParseUUIDPipe) modificationId: string,
    @Body() request: DecideBookingModificationDto,
  ) {
    return this.bookings.decideModification(user, modificationId, request);
  }

  @Post("bookings/:bookingId/confirm-completion")
  confirmCompletion(
    @CurrentUser() user: AuthenticatedUser,
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
  ) {
    return this.bookings.confirmCompletion(user, bookingId);
  }

  @Post("bookings/:bookingId/report-completion")
  reportCompletion(
    @CurrentUser() user: AuthenticatedUser,
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
    @Body() request: ReportBookingCompletionDto,
  ) {
    return this.bookings.reportCompletion(user, bookingId, request);
  }

  @Post("bookings/conflicts/resolve")
  @ApiOkResponse({ description: "Explicitly keeps one confirmation and cancels the caller-selected conflicts." })
  resolveConflicts(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: ResolveBookingConflictsDto,
  ) {
    return this.bookings.resolveConflicts(user, request);
  }
}
