import { EventEmitter } from "node:events";
import { Pool } from "pg";
import { DatabaseService } from "./database.service";

jest.mock("pg", () => ({ Pool: jest.fn() }));

function harness() {
  const client = Object.assign(new EventEmitter(), {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
  });
  const pool = { on: jest.fn(), connect: jest.fn().mockResolvedValue(client), end: jest.fn() };
  (Pool as unknown as jest.Mock).mockImplementation(() => pool);
  return { service: new DatabaseService("postgresql://unused"), client };
}

describe("DatabaseService.transaction", () => {
  it("handles a reset on a checked-out client without an unhandled event", async () => {
    const { service, client } = harness();
    const reset = new Error("read ECONNRESET");
    await expect(service.transaction(async () => {
      client.emit("error", reset);
      return "unused";
    })).rejects.toBe(reset);
    expect(client.release).toHaveBeenCalledWith(reset);
  });

  it("keeps the original query error when rollback fails", async () => {
    const { service, client } = harness();
    const queryError = new Error("query failed");
    const rollbackError = new Error("socket closed");
    client.query.mockResolvedValueOnce({}); // BEGIN
    client.query.mockRejectedValueOnce(queryError);
    client.query.mockRejectedValueOnce(rollbackError);
    await expect(service.transaction(async (connection) => connection.query("SELECT 1"))).rejects.toBe(queryError);
    expect(client.release).toHaveBeenCalledWith(rollbackError);
  });

  it("releases a healthy client after commit", async () => {
    const { service, client } = harness();
    await expect(service.transaction(async () => 42)).resolves.toBe(42);
    expect(client.release).toHaveBeenCalledWith(undefined);
  });
});
