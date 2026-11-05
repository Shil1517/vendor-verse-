import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { NextFunction, Request, Response } from "express";

interface RequestContext {
  correlationId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Correlation id of the request being handled, if any (F-ADM-05). */
export function currentCorrelationId(): string | null {
  return storage.getStore()?.correlationId ?? null;
}

/** Gives every request a correlation id, returns it in a header, and keeps it
 * available to the audit trail for the whole async call chain. */
export function correlationMiddleware(
  _request: Request,
  response: Response,
  next: NextFunction,
): void {
  const correlationId = randomUUID();
  response.setHeader("correlation-id", correlationId);
  storage.run({ correlationId }, next);
}
