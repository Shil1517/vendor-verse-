import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import { FilesService } from "../files/files.service";
import { RequirePermission } from "../rbac/permission.guard";
import {
  CreateVendorDocumentDto,
  ListVerificationQueueQuery,
  SubmitVerificationDto,
  VerificationReviewDto,
} from "./dto/verification.dto";
import { VerificationService } from "./verification.service";

@Controller("vendors/:vendorId")
@UseGuards(AccessTokenGuard)
@ApiTags("Vendor verification")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Access token is invalid or expired." })
@ApiNotFoundResponse({ description: "No such vendor for this user." })
export class VendorVerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Post("documents")
  @ApiOperation({
    summary: "Register clean, uploaded verification evidence (F-VND-03)",
  })
  @ApiCreatedResponse({ description: "The private vendor document record." })
  addDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
    @Body() request: CreateVendorDocumentDto,
  ) {
    return this.verification.addDocument(user, vendorId, request);
  }

  @Get("documents")
  @ApiOperation({ summary: "List the caller's private vendor documents" })
  @ApiOkResponse({ description: "Documents owned by this vendor." })
  listDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
  ) {
    return this.verification.listDocuments(user, vendorId);
  }

  @Post("verifications")
  @ApiOperation({
    summary: "Submit or resubmit a vendor verification level",
    description:
      "L0 is assigned at vendor registration. Category-specific requests require that category to be selected by the vendor. A review in progress blocks duplicate submissions.",
  })
  @ApiCreatedResponse({ description: "The submitted verification." })
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
    @Body() request: SubmitVerificationDto,
  ) {
    return this.verification.submit(user, vendorId, request);
  }

  @Get("verifications")
  @ApiOperation({ summary: "List the caller's verification history" })
  @ApiOkResponse({ description: "Verification records and evidence refs." })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
  ) {
    return this.verification.listForVendor(user, vendorId);
  }
}

@Controller("admin")
@ApiTags("Admin: vendor verification")
export class AdminVerificationController {
  constructor(
    private readonly verification: VerificationService,
    private readonly files: FilesService,
  ) {}

  @Get("verifications")
  @RequirePermission("verification.review")
  @ApiOperation({ summary: "Review queue for vendor verification (F-VND-03)" })
  @ApiOkResponse({ description: "Verification queue, oldest first." })
  list(@Query() query: ListVerificationQueueQuery) {
    return this.verification.listReviewQueue({
      status: query.status,
      limit: query.limit ?? 50,
      cursor: query.cursor,
    });
  }

  @Post("verifications/:verificationId/decision")
  @RequirePermission("verification.review")
  @ApiOperation({
    summary: "Record a verification review action",
    description:
      "A reason is required and audited. Reviewers cannot act on their own vendor's verification. No expiry duration is assumed.",
  })
  @ApiOkResponse({ description: "The updated verification." })
  review(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("verificationId", ParseUUIDPipe) verificationId: string,
    @Body() request: VerificationReviewDto,
  ) {
    return this.verification.review(
      actor,
      verificationId,
      request.status,
      request.reason,
      request.expiresAt,
    );
  }

  @Get("verifications/:verificationId/evidence/:fileId/download-url")
  @RequirePermission("verification.review")
  @ApiOperation({
    summary: "Get a short-lived URL for evidence on this verification",
  })
  @ApiOkResponse({ description: "The private file download URL." })
  downloadEvidence(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("verificationId", ParseUUIDPipe) verificationId: string,
    @Param("fileId", ParseUUIDPipe) fileId: string,
  ) {
    return this.files.reviewEvidenceDownloadUrl(
      actor,
      verificationId,
      fileId,
    );
  }
}
