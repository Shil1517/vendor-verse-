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
    const errors = this.validationErrors(exception);

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
        ...(errors ? { errors } : {}),
      });
  }

  private validationErrors(exception: unknown): string[] | undefined {
    if (!(exception instanceof HttpException)) {
      return undefined;
    }
    const body = exception.getResponse();
    if (typeof body !== "object" || body === null || !("message" in body)) {
      return undefined;
    }
    const { message } = body as { message: unknown };
    return Array.isArray(message) ? message.map(String) : undefined;
  }
}
