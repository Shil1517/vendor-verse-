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
  ApiCreatedResponse,
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
  ContractVersionDto,
  CreateContractDto,
  CreateMilestoneDto,
  DeclineContractDto,
  MilestoneActionDto,
} from "./dto/contract.dto";
import { ContractsService } from "./contracts.service";

@Controller()
@UseGuards(AccessTokenGuard)
@ApiTags("Contracts")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Access token is invalid or expired." })
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @Post("contracts")
  @ApiOperation({ summary: "Propose a contract using the category's configured template (F-CON-01)" })
  @ApiCreatedResponse({ description: "The proposed contract and initial immutable version." })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: CreateContractDto,
  ) {
    return this.contracts.create(user, request);
  }

  @Get("me/contracts")
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.contracts.listMine(user);
  }

  @Get("vendors/:vendorId/contracts")
  listForVendor(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
  ) {
    return this.contracts.listForVendor(user, vendorId);
  }

  @Get("contracts/:contractId")
  @ApiNotFoundResponse({ description: "No such contract for this user." })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param("contractId", ParseUUIDPipe) contractId: string,
  ) {
    return this.contracts.get(user, contractId);
  }

  @Post("contracts/:contractId/versions")
  @ApiOperation({ summary: "Counter with a new immutable contract version" })
  counter(
    @CurrentUser() user: AuthenticatedUser,
    @Param("contractId", ParseUUIDPipe) contractId: string,
    @Body() request: ContractVersionDto,
  ) {
    return this.contracts.counter(user, contractId, request);
  }

  @Post("contracts/:contractId/accept")
  @ApiOperation({ summary: "Accept the current version; both parties must accept the same version" })
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Param("contractId", ParseUUIDPipe) contractId: string,
  ) {
    return this.contracts.accept(user, contractId);
  }

  @Post("contracts/:contractId/decline")
  decline(
    @CurrentUser() user: AuthenticatedUser,
    @Param("contractId", ParseUUIDPipe) contractId: string,
    @Body() request: DeclineContractDto,
  ) {
    return this.contracts.decline(user, contractId, request);
  }

  @Post("contracts/:contractId/milestones")
  @ApiOperation({ summary: "Add a milestone to an active contract (F-CON-02)" })
  createMilestone(
    @CurrentUser() user: AuthenticatedUser,
    @Param("contractId", ParseUUIDPipe) contractId: string,
    @Body() request: CreateMilestoneDto,
  ) {
    return this.contracts.createMilestone(user, contractId, request);
  }

  @Post("milestones/:milestoneId/actions")
  @ApiOperation({ summary: "Start, complete, confirm, or dispute a milestone" })
  milestoneAction(
    @CurrentUser() user: AuthenticatedUser,
    @Param("milestoneId", ParseUUIDPipe) milestoneId: string,
    @Body() request: MilestoneActionDto,
  ) {
    return this.contracts.milestoneAction(user, milestoneId, request);
  }

  @Post("contracts/:contractId/complete")
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("contractId", ParseUUIDPipe) contractId: string,
  ) {
    return this.contracts.complete(user, contractId);
  }
}
