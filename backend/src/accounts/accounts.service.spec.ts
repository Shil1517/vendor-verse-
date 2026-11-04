import { ConflictException, ServiceUnavailableException } from "@nestjs/common";
import { QueryResult } from "pg";
import { DatabaseService } from "../database/database.service";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { AccountsService } from "./accounts.service";

const user: AuthenticatedUser = {
  userId: "00000000-0000-0000-0000-000000000001",
  sessionId: "00000000-0000-0000-0000-000000000002",
};

describe("AccountsService", () => {
  let database: DatabaseService;
  let query: jest.SpyInstance;
  let service: AccountsService;

  beforeEach(() => {
    database = new DatabaseService("postgresql://test:test@localhost/test");
    query = jest.spyOn(database, "query");
    service = new AccountsService(database);
  });

  afterEach(async () => {
    query.mockRestore();
    await database.onModuleDestroy();
  });

  it("returns only modes backed by current ownership", async () => {
    query.mockResolvedValue({
      rows: [{ id: user.userId, current_mode: "vendor", has_vendor: true }],
      rowCount: 1,
      command: "SELECT",
      oid: 0,
      fields: [],
    } satisfies QueryResult<Record<string, unknown>>);

    await expect(service.getCurrentContext(user)).resolves.toEqual({
      userId: user.userId,
      currentMode: "VENDOR",
      availableModes: ["CUSTOMER", "VENDOR"],
    });
  });

  it("does not silently treat an unavailable current mode as customer", async () => {
    query.mockResolvedValue({
      rows: [{ id: user.userId, current_mode: "vendor", has_vendor: false }],
      rowCount: 1,
      command: "SELECT",
      oid: 0,
      fields: [],
    } satisfies QueryResult<Record<string, unknown>>);

    await expect(service.getCurrentContext(user)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it("does not enable business mode without verified business persistence", async () => {
    await expect(
      service.switchMode(user, { mode: "BUSINESS" }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(query).not.toHaveBeenCalled();
  });
});
