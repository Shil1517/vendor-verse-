import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly database: DatabaseService) {}

  @Get("live")
  live(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("ready")
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
