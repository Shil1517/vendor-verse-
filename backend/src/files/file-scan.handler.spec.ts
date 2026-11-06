import { DatabaseService } from "../database/database.service";
import { OutboxDispatcherService } from "../platform/outbox-dispatcher.service";
import { FileScanner } from "./file-storage.provider";
import { FileScanHandler } from "./file-scan.handler";

const event = {
  id: "e1",
  aggregateType: "file",
  aggregateId: "f1",
  eventType: "file.uploaded",
  payload: {},
  attempts: 0,
};

describe("FileScanHandler", () => {
  let query: jest.Mock;
  const build = (scanner: FileScanner | null) => {
    const register = jest.fn();
    const handler = new FileScanHandler(
      { query } as unknown as DatabaseService,
      { register } as unknown as OutboxDispatcherService,
      scanner,
    );
    return { handler, register };
  };

  beforeEach(() => {
    query = jest.fn();
  });

  it("registers for the upload event", () => {
    const { handler, register } = build(null);
    handler.onModuleInit();
    expect(register).toHaveBeenCalledWith(handler);
    expect(handler.eventType).toBe("file.uploaded");
  });

  it("fails, so the outbox retries, when no scanner is configured", async () => {
    const { handler } = build(null);
    await expect(handler.handle(event)).rejects.toThrow("No file scanner");
    expect(query).not.toHaveBeenCalled();
  });

  it.each(["clean", "infected", "failed"] as const)(
    "records a %s verdict",
    async (verdict) => {
      query
        .mockResolvedValueOnce({ rows: [{ storage_key: "k" }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });
      const scan = jest.fn().mockResolvedValue(verdict);
      const { handler } = build({ scan });

      await handler.handle(event);

      expect(scan).toHaveBeenCalledWith("k");
      expect(query.mock.calls[1][1]).toEqual(["f1", verdict]);
    },
  );

  it("skips a file that was already scanned or removed", async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const scan = jest.fn();
    const { handler } = build({ scan });

    await handler.handle(event);

    expect(scan).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledTimes(1);
  });
});
