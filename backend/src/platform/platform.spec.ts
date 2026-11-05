import { CallHandler, ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { of, throwError } from "rxjs";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "./audit.service";
import { IdempotencyInterceptor } from "./idempotency.interceptor";
import { OutboxService } from "./outbox.service";
import { RateLimitService } from "./rate-limit.service";
import { correlationMiddleware, currentCorrelationId } from "./request-context";

const result = (rows: unknown[] = [], rowCount = rows.length) => ({
  rows,
  rowCount,
});

describe("platform", () => {
  let query: jest.Mock;
  let database: DatabaseService;

  beforeEach(() => {
    query = jest.fn().mockResolvedValue(result());
    database = { query } as unknown as DatabaseService;
  });

  describe("RateLimitService", () => {
    it("returns the window count and rejects over the maximum", async () => {
      const limiter = new RateLimitService(database);
      query.mockResolvedValueOnce(result([{ request_count: 2 }]));
      await expect(limiter.consume("s", "h", 2, 60)).resolves.toBeUndefined();
      query.mockResolvedValueOnce(result([{ request_count: 3 }]));
      await expect(limiter.consume("s", "h", 2, 60)).rejects.toMatchObject({
        status: 429,
      });
    });
  });

  describe("AuditService", () => {
    it("requires an actor", async () => {
      await expect(
        new AuditService(database).record({
          action: "a",
          targetType: "t",
          targetId: "1",
        }),
      ).rejects.toThrow("actor");
    });

    it("writes through the supplied client with the request correlation id", async () => {
      const client = { query: jest.fn().mockResolvedValue(result()) };
      const response = { setHeader: jest.fn() };
      await new Promise<void>((resolve, reject) => {
        correlationMiddleware({} as never, response as never, () => {
          new AuditService(database)
            .record(
              {
                actorUserId: "u1",
                action: "session.revoke",
                targetType: "session",
                targetId: "s1",
                metadata: { by: "self" },
              },
              client as never,
            )
            .then(() => resolve(), reject);
        });
      });
      expect(query).not.toHaveBeenCalled();
      const [sql, values] = client.query.mock.calls[0];
      expect(sql).toContain("INSERT INTO audit_events");
      expect(values[0]).toBe("u1");
      expect(values[7]).toBe(response.setHeader.mock.calls[0][1]);
      expect(values[8]).toBe('{"by":"self"}');
      expect(currentCorrelationId()).toBeNull();
    });
  });

  describe("OutboxService", () => {
    it("enqueues an event", async () => {
      await new OutboxService(database).enqueue({
        aggregateType: "vendor",
        aggregateId: "v1",
        eventType: "vendor.updated",
      });
      expect(query.mock.calls[0][1]).toEqual([
        "vendor",
        "v1",
        "vendor.updated",
        "{}",
      ]);
    });
  });

  describe("IdempotencyInterceptor", () => {
    const config = {
      getOrThrow: (key: string) =>
        key === "IDEMPOTENCY_TTL_SECONDS" ? 60 : 10,
    } as unknown as ConfigService;

    const setup = (
      headers: Record<string, string>,
      method = "POST",
      body: unknown = { a: 1 },
    ) => {
      const response = {
        statusCode: 201,
        setHeader: jest.fn(),
        status: jest.fn(),
      };
      const request = {
        method,
        path: "/v1/things",
        ip: "1.1.1.1",
        headers,
        body,
        authenticatedUser: { userId: "u1" },
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => response,
        }),
      } as unknown as ExecutionContext;
      return { context, response };
    };
    const handler = (value: unknown = { id: 1 }): CallHandler => ({
      handle: jest.fn(() => of(value)),
    });
    const run = (
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<unknown> =>
      new Promise((resolve, reject) => {
        new IdempotencyInterceptor(database, config)
          .intercept(context, next)
          .subscribe({ next: resolve, error: reject });
      });

    /** Answers the interceptor's queries as the idempotency table would. */
    const existingRow = (
      stored: (hash: string) => Record<string, unknown>,
    ): void => {
      let hash = "";
      query.mockImplementation(async (sql: string, values: string[]) => {
        if (sql.includes("INSERT INTO")) {
          hash = values[2];
          return result([], 0);
        }
        if (sql.includes("SELECT")) {
          return result([stored(hash)]);
        }
        return result();
      });
    };

    it("passes through without a key or on safe methods", async () => {
      const next = handler();
      await run(setup({}).context, next);
      await run(setup({ "idempotency-key": "k" }, "GET").context, next);
      expect(next.handle).toHaveBeenCalledTimes(2);
      expect(query).not.toHaveBeenCalled();
    });

    it("rejects an empty key", () => {
      expect(() =>
        new IdempotencyInterceptor(database, config).intercept(
          setup({ "idempotency-key": " " }).context,
          handler(),
        ),
      ).toThrow("Idempotency-Key");
    });

    it("runs the handler once and stores the response", async () => {
      query
        .mockResolvedValueOnce(result())
        .mockResolvedValueOnce(result([], 1));
      const { context } = setup({ "idempotency-key": "k" });
      await expect(run(context, handler())).resolves.toEqual({ id: 1 });
      const update = query.mock.calls.at(-1)!;
      expect(update[0]).toContain("UPDATE idempotency_keys");
      expect(update[1].slice(2)).toEqual([201, '{"id":1}']);
    });

    it("replays the stored response without running the handler", async () => {
      existingRow((hash) => ({
        request_hash: hash,
        response_status: 201,
        response_body: { id: 9 },
        in_flight: false,
      }));
      const next = handler();
      const { context, response } = setup({ "idempotency-key": "k" });
      await expect(run(context, next)).resolves.toEqual({ id: 9 });
      expect(next.handle).not.toHaveBeenCalled();
      expect(response.status).toHaveBeenCalledWith(201);
      expect(response.setHeader).toHaveBeenCalledWith(
        "Idempotent-Replayed",
        "true",
      );
    });

    it("rejects the same key used with a different request", async () => {
      existingRow(() => ({
        request_hash: "other",
        response_status: 201,
        response_body: null,
        in_flight: false,
      }));
      await expect(
        run(setup({ "idempotency-key": "k" }).context, handler()),
      ).rejects.toMatchObject({ status: 422 });
    });

    it("rejects a duplicate while the first request is in flight", async () => {
      existingRow((hash) => ({
        request_hash: hash,
        response_status: null,
        response_body: null,
        in_flight: true,
      }));
      await expect(
        run(setup({ "idempotency-key": "k" }).context, handler()),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("frees the key when the handler fails", async () => {
      query
        .mockResolvedValueOnce(result())
        .mockResolvedValueOnce(result([], 1));
      const next: CallHandler = {
        handle: () => throwError(() => new Error("boom")),
      };
      await expect(
        run(setup({ "idempotency-key": "k" }).context, next),
      ).rejects.toThrow("boom");
      expect(query.mock.calls.at(-1)![0]).toContain(
        "DELETE FROM idempotency_keys",
      );
    });
  });
});
