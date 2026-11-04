import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

export interface AuthenticatedUser {
  userId: string;
  sessionId: string;
}

type AuthenticatedRequest = Request & { authenticatedUser: AuthenticatedUser };

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().authenticatedUser,
);
