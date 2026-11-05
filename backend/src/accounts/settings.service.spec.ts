import { ConflictException, NotFoundException } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { SettingsService } from "./settings.service";

const user: AuthenticatedUser = { userId: "u1", sessionId: "s1" };
const result = (rows: unknown[] = [], rowCount = rows.length) => ({
  rows,
  rowCount,
});
const requestRow = (over: Record<string, unknown> = {}) => ({
  id: "r1",
  request_type: "export",
  status: "requested",
  requested_at: new Date("2026-11-05T10:00:00Z"),
  completed_at: null,
  ...over,
});

describe("SettingsService", () => {
  let query: jest.Mock;
  let clientQuery: jest.Mock;
  let record: jest.Mock;
  let service: SettingsService;

  beforeEach(() => {
    query = jest.fn();
    clientQuery = jest.fn();
    record = jest.fn().mockResolvedValue(undefined);
    const database = {
      query,
      transaction: (operation: (client: unknown) => unknown) =>
        operation({ query: clientQuery }),
    } as unknown as DatabaseService;
    service = new SettingsService(database, {
      record,
    } as unknown as AuditService);
  });

  it("lists sessions and flags the current one", async () => {
    query.mockResolvedValue(
      result([
        {
          id: "s1",
          created_at: new Date("2026-11-05T09:00:00Z"),
          expires_at: new Date("2026-11-06T09:00:00Z"),
          device_metadata: {},
        },
        {
          id: "s2",
          created_at: new Date("2026-11-04T09:00:00Z"),
          expires_at: new Date("2026-11-06T09:00:00Z"),
          device_metadata: {},
        },
      ]),
    );
    const sessions = await service.listSessions(user);
    expect(sessions.map((s) => s.current)).toEqual([true, false]);
    expect(query.mock.calls[0][1]).toEqual(["u1"]);
  });

  it("revokes only the user's own session and audits it", async () => {
    clientQuery.mockResolvedValueOnce(result([], 1));
    await service.revokeSession(user, "s2");
    expect(clientQuery.mock.calls[0][1]).toEqual(["s2", "u1"]);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "session.revoke", targetId: "s2" }),
      expect.anything(),
    );
  });

  it("reports 404 for a session that is not the user's", async () => {
    clientQuery.mockResolvedValueOnce(result([], 0));
    await expect(service.revokeSession(user, "x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(record).not.toHaveBeenCalled();
  });

  it("upserts each preference then returns the stored set", async () => {
    clientQuery.mockResolvedValue(result());
    query.mockResolvedValue(
      result([{ channel: "sms", category: "offers", enabled: false }]),
    );
    const out = await service.updateNotificationPreferences(user, [
      { channel: "sms", category: "offers", enabled: false },
      { channel: "email", category: "offers", enabled: true },
    ]);
    expect(clientQuery).toHaveBeenCalledTimes(2);
    expect(out).toEqual([
      { channel: "sms", category: "offers", enabled: false },
    ]);
  });

  it("records a data request and audits it", async () => {
    clientQuery.mockResolvedValueOnce(result([requestRow()]));
    await expect(
      service.createDataRequest(user, { type: "export" }),
    ).resolves.toMatchObject({ id: "r1", type: "export", status: "requested" });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "account.export_requested" }),
      expect.anything(),
    );
  });

  it("maps a duplicate open request to 409", async () => {
    clientQuery.mockRejectedValueOnce(
      Object.assign(new Error("dup"), { code: "23505" }),
    );
    await expect(
      service.createDataRequest(user, { type: "deletion" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("cancels an open request and 404s otherwise", async () => {
    clientQuery.mockResolvedValueOnce(
      result([requestRow({ status: "cancelled" })]),
    );
    await expect(service.cancelDataRequest(user, "r1")).resolves.toMatchObject({
      status: "cancelled",
    });
    clientQuery.mockResolvedValueOnce(result());
    await expect(service.cancelDataRequest(user, "r2")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
