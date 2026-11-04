import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof HttpException
        ? exception.message
        : "An unexpected error occurred";

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        `Unhandled request error for ${request.method} ${request.path}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response
      .status(status)
      .type("application/problem+json")
      .json({
        type: "about:blank",
        title: HttpStatus[status] ?? "Error",
        status,
        detail: message,
        instance: request.path,
      });
  }
}
