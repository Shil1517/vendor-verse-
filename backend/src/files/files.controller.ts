import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AccessTokenGuard } from "../auth/access-token.guard";
import {
  AuthenticatedUser,
  CurrentUser,
} from "../auth/authenticated-user.decorator";
import { CreateFileDto } from "./dto/files.dto";
import { FilesService } from "./files.service";

@Controller("files")
@UseGuards(AccessTokenGuard)
@ApiTags("Files")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Access token is invalid or expired." })
@ApiServiceUnavailableResponse({
  description:
    "File storage policy is not configured (provider, limits and URL lifetimes are open decisions).",
})
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post()
  @ApiOperation({
    summary: "Declare a file and get a signed upload URL",
    description:
      "Send the bytes to the returned URL, then call POST /files/:id/complete. The file is private and unusable until its scan is clean.",
  })
  @ApiCreatedResponse({ description: "The file record and the upload target." })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateFileDto) {
    return this.files.create(user, body);
  }

  @Post(":fileId/complete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Confirm the upload finished and queue the scan" })
  @ApiOkResponse({ description: "The file record." })
  @ApiNotFoundResponse({ description: "Not one of the caller's files." })
  @ApiConflictResponse({
    description: "No upload received, or its size does not match.",
  })
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("fileId", ParseUUIDPipe) fileId: string,
  ) {
    return this.files.complete(user, fileId);
  }

  @Get(":fileId")
  @ApiOperation({ summary: "File record with its scan status" })
  @ApiOkResponse()
  @ApiNotFoundResponse({ description: "Not one of the caller's files." })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param("fileId", ParseUUIDPipe) fileId: string,
  ) {
    return this.files.get(user, fileId);
  }

  @Get(":fileId/download-url")
  @ApiOperation({ summary: "Short-lived download URL for a clean file" })
  @ApiOkResponse()
  @ApiNotFoundResponse({ description: "Not one of the caller's files." })
  @ApiConflictResponse({ description: "The file has not passed its scan." })
  downloadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param("fileId", ParseUUIDPipe) fileId: string,
  ) {
    return this.files.downloadUrl(user, fileId);
  }
}
