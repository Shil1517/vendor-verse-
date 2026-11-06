import { NotFoundException } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { OutboxService } from "../platform/outbox.service";
import { INBOX_MAX_LIMIT, NotificationsService } from "./notifications.service";

const user: AuthenticatedUser = { userId: "u1", sessionId: "s1" };
const input = {
  recipientUserId: "u1",
  eventType: "listing.approved",
  category: "listings",
  dedupeKey: "listing:l1:approved",
  linkedResource: { type: "listing", id: "l1" },
};

describe("NotificationsService", () => {
  let query: jest.Mock;
  let enqueue: jest.Mock;
  let service: NotificationsService;

  beforeEach(() => {
    query = jest.fn();
    enqueue = jest.fn().mockResolvedValue(undefined);
    service = new NotificationsService(
      { query } as unknown as DatabaseService,
      { enqueue } as unknown as OutboxService,
    );
  });

  it("stores the notification and queues delivery in the caller's transaction", async () => {
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [{ id: "n1" }] }),
    };

    const id = await service.notify(input, client as never);

    expect(id).toBe("n1");
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(query).not.toHaveBeenCalled();
    expect(enqueue).toHaveBeenCalledWith(
      {
        aggregateType: "notification",
        aggregateId: "n1",
        eventType: "notification.created",
      },
      client,
    );
  });

  it("does not queue a duplicate when the dedupe key was already used", async () => {
    query.mockResolvedValue({ rows: [] });

    expect(await service.notify(input)).toBeNull();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("maps rows to inbox items with the deep-link target", async () => {
    query.mockResolvedValue({
      rows: [
        {
          id: "n1",
          event_type: "listing.approved",
          category: "listings",
          payload: {},
          linked_resource_type: "listing",
          linked_resource_id: "l1",
          read_at: null,
          created_at: new Date("2026-11-06T10:00:00Z"),
        },
      ],
    });

    const [item] = await service.list(user, { unreadOnly: false, limit: 20 });

    expect(item).toMatchObject({
      id: "n1",
      read: false,
      linkedResource: { type: "listing", id: "l1" },
      createdAt: "2026-11-06T10:00:00.000Z",
    });
  });

  it("caps the page size and scopes to the caller", async () => {
    query.mockResolvedValue({ rows: [] });

    await service.list(user, { unreadOnly: true, limit: 9999 });

    const values = query.mock.calls[0][1];
    expect(values[0]).toBe("u1");
    expect(values[3]).toBe(INBOX_MAX_LIMIT);
  });

  it("reports 404 when marking someone else's notification read", async () => {
    query.mockResolvedValue({ rows: [], rowCount: 0 });

    await expect(service.markRead(user, "n9")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(query.mock.calls[0][1]).toEqual(["n9", "u1"]);
  });

  it("counts unread and marks all read for the caller only", async () => {
    query.mockResolvedValueOnce({ rows: [{ count: "3" }] });
    expect(await service.unreadCount(user)).toBe(3);

    query.mockResolvedValueOnce({ rows: [], rowCount: 3 });
    expect(await service.markAllRead(user)).toBe(3);
    expect(query.mock.calls[1][1]).toEqual(["u1"]);
  });
});
