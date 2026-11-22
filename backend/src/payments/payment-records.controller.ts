import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { AuthenticatedUser, CurrentUser } from "../auth/authenticated-user.decorator";
import { CreatePaymentRecordDto, PaymentRecordQueryDto } from "./dto/payment-record.dto";
import { PaymentRecordsService } from "./payment-records.service";

@Controller("payment-records")
@UseGuards(AccessTokenGuard)
@ApiBearerAuth()
@ApiTags("Payment records")
export class PaymentRecordsController {
  constructor(private readonly records: PaymentRecordsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: PaymentRecordQueryDto) {
    return this.records.list(user, query);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreatePaymentRecordDto) {
    return this.records.create(user, body);
  }
}
