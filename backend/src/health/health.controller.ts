import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import { DatabaseService } from "../database/database.service";

@Controller("health")
@ApiTags("Health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly database: DatabaseService) {}

  @Get("live")
  @ApiOperation({ summary: "Check that the API process is running" })
  @ApiOkResponse({ schema: { example: { status: "ok" } } })
  live(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("ready")
  @ApiOperation({ summary: "Check API and database readiness" })
  @ApiOkResponse({ schema: { example: { status: "ok" } } })
  @ApiServiceUnavailableResponse({ description: "Database is unavailable." })
  async ready(): Promise<{ status: "ok" }> {
    try {
      await this.database.checkConnection();
    } catch (error) {
      this.logger.error(
        "Database readiness check failed",
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException("Database is unavailable");
    }
    return { status: "ok" };
  }
}
