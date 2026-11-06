import { DatabaseService } from "../database/database.service";
import { OutboxDispatcherService } from "../platform/outbox-dispatcher.service";
import { NotificationChannelProvider } from "./notification-channel.provider";
import { NotificationDispatchHandler } from "./notification-dispatch.handler";

const event = {
  id: "e1",
  aggregateType: "notification",
  aggregateId: "n1",
  eventType: "notification.created",
  payload: {},
  attempts: 0,
};
const notification = {
  recipient_user_id: "u1",
  event_type: "listing.approved",
  category: "listings",
  payload: {},
};
const template = (over: Record<string, unknown> = {}) => ({
  channel: "sms",
  localized_content: { en: "hi" },
  is_mandatory: false,
  provider_template_id: null,
  ...over,
});

describe("NotificationDispatchHandler", () => {
  let query: jest.Mock;
  let templates: unknown[];
  let preference: unknown[];
  let attemptStatus: string;

  const build = (providers: NotificationChannelProvider[] = []) => {
    const register = jest.fn();
    const handler = new NotificationDispatchHandler(
      { query } as unknown as DatabaseService,
      { register } as unknown as OutboxDispatcherService,
      providers,
    );
    return { handler, register };
  };
  const finishes = () =>
    query.mock.calls
      .filter(([sql]) => /SET status/.test(sql))
      .map(([, values]) => [values[1], values[3]]);

  beforeEach(() => {
    templates = [];
    preference = [];
    attemptStatus = "pending";
    query = jest.fn(async (sql: string) => {
      if (/FROM notifications WHERE id/.test(sql))
        return { rows: [notification] };
      if (/FROM notification_templates/.test(sql)) return { rows: templates };
      if (/SELECT id, status FROM notification_delivery_attempts/.test(sql))
        return { rows: [{ id: "a1", status: attemptStatus }] };
      if (/FROM notification_preferences/.test(sql))
        return { rows: preference };
      return { rows: [], rowCount: 1 };
    });
  });

  it("registers itself with the dispatcher on startup", () => {
    const { handler, register } = build();
    handler.onModuleInit();
    expect(register).toHaveBeenCalledWith(handler);
  });

  it("does nothing when no external template exists", async () => {
    const { handler } = build();
    await handler.handle(event);
    expect(finishes()).toEqual([]);
  });

  it("records a skipped attempt when the channel has no provider", async () => {
    templates = [template()];
    const { handler } = build();

    await handler.handle(event);

    expect(finishes()).toEqual([
      ["skipped", "No provider configured for this channel"],
    ]);
  });

  it("sends through the provider and records the reference", async () => {
    templates = [template()];
    const send = jest.fn().mockResolvedValue("prov-1");
    const { handler } = build([{ channel: "sms", send }]);

    await handler.handle(event);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ notificationId: "n1", recipientUserId: "u1" }),
    );
    const finish = query.mock.calls.find(([sql]) => /SET status/.test(sql));
    expect(finish?.[1]).toEqual(["a1", "sent", "prov-1", null]);
  });

  it("honours a user who switched the channel off", async () => {
    templates = [template()];
    preference = [{ enabled: false }];
    const send = jest.fn();
    const { handler } = build([{ channel: "sms", send }]);

    await handler.handle(event);

    expect(send).not.toHaveBeenCalled();
    expect(finishes()).toEqual([["skipped", "Disabled by user"]]);
  });

  it("sends a mandatory notice even when the user switched the channel off", async () => {
    templates = [template({ is_mandatory: true })];
    preference = [{ enabled: false }];
    const send = jest.fn().mockResolvedValue(null);
    const { handler } = build([{ channel: "sms", send }]);

    await handler.handle(event);

    expect(send).toHaveBeenCalledTimes(1);
  });

  it("does not repeat a channel that was already sent", async () => {
    templates = [template()];
    attemptStatus = "sent";
    const send = jest.fn();
    const { handler } = build([{ channel: "sms", send }]);

    await handler.handle(event);

    expect(send).not.toHaveBeenCalled();
  });

  it("tries every channel, then rethrows so the outbox retries", async () => {
    templates = [template({ channel: "sms" }), template({ channel: "email" })];
    const sms = jest.fn().mockRejectedValue(new Error("gateway timeout"));
    const email = jest.fn().mockResolvedValue("m1");
    const { handler } = build([
      { channel: "sms", send: sms },
      { channel: "email", send: email },
    ]);

    await expect(handler.handle(event)).rejects.toThrow("gateway timeout");

    expect(email).toHaveBeenCalledTimes(1);
    expect(finishes()).toEqual([
      ["failed", "gateway timeout"],
      ["sent", null],
    ]);
  });
});
