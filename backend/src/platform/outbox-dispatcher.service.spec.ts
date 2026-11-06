import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../database/database.service";
import {
  OUTBOX_MAX_ATTEMPTS,
  OutboxDispatcherService,
  OutboxHandler,
  retryDelaySeconds,
} from "./outbox-dispatcher.service";

const row = (over: Record<string, unknown> = {}) => ({
  id: "e1",
  aggregate_type: "notification",
  aggregate_id: "n1",
  event_type: "notification.created",
  payload: {},
  attempts: 0,
  ...over,
});

describe("OutboxDispatcherService", () => {
  let clientQuery: jest.Mock;
  let service: OutboxDispatcherService;

  beforeEach(() => {
    clientQuery = jest.fn();
    const database = {
      transaction: (operation: (client: unknown) => unknown) =>
        operation({ query: clientQuery }),
    } as unknown as DatabaseService;
    service = new OutboxDispatcherService(database, {
      get: () => "test",
    } as unknown as ConfigService);
  });

  const claim = (...rows: unknown[]) =>
    clientQuery.mockResolvedValueOnce({ rows, rowCount: rows.length });
  const updates = () =>
    clientQuery.mock.calls.filter(([sql]) => /UPDATE outbox_events/.test(sql));

  it("runs the matching handler and marks the event processed", async () => {
    const handle = jest.fn().mockResolvedValue(undefined);
    service.register({ eventType: "notification.created", handle });
    claim(row());
    clientQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    expect(await service.dispatchBatch()).toBe(1);

    expect(handle).toHaveBeenCalledWith(
      expect.objectContaining({ id: "e1", aggregateId: "n1" }),
    );
    expect(updates()[0][0]).toContain("processed_at = CURRENT_TIMESTAMP");
  });

  it("marks an event with no handler processed", async () => {
    claim(row({ event_type: "unknown.event" }));
    clientQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    await service.dispatchBatch();

    expect(updates()[0][0]).toContain("processed_at = CURRENT_TIMESTAMP");
  });

  it("reschedules a failed event with exponential backoff", async () => {
    const handler: OutboxHandler = {
      eventType: "notification.created",
      handle: jest.fn().mockRejectedValue(new Error("provider down")),
    };
    service.register(handler);
    claim(row({ attempts: 2 }));
    clientQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    await service.dispatchBatch();

    const [sql, values] = updates()[0];
    expect(sql).toContain("available_at");
    expect(sql).not.toContain("dead_lettered_at");
    expect(values).toEqual(["e1", 3, "provider down", retryDelaySeconds(3)]);
  });

  it("dead-letters an event after the last attempt", async () => {
    service.register({
      eventType: "notification.created",
      handle: jest.fn().mockRejectedValue(new Error("still down")),
    });
    claim(row({ attempts: OUTBOX_MAX_ATTEMPTS - 1 }));
    clientQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    await service.dispatchBatch();

    const [sql, values] = updates()[0];
    expect(sql).toContain("dead_lettered_at = CURRENT_TIMESTAMP");
    expect(values[1]).toBe(OUTBOX_MAX_ATTEMPTS);
  });

  it("keeps handling the batch after one event fails", async () => {
    const handle = jest
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);
    service.register({ eventType: "notification.created", handle });
    claim(row({ id: "e1" }), row({ id: "e2" }));
    clientQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    await service.dispatchBatch();

    expect(handle).toHaveBeenCalledTimes(2);
    expect(updates()).toHaveLength(2);
  });

  it("doubles the delay on each attempt", () => {
    expect(retryDelaySeconds(2)).toBe(retryDelaySeconds(1) * 2);
    expect(retryDelaySeconds(3)).toBe(retryDelaySeconds(1) * 4);
  });
});
