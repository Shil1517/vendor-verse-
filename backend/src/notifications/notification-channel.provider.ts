export type NotificationChannel = "push" | "sms" | "email" | "in_app";

export interface ChannelMessage {
  notificationId: string;
  recipientUserId: string;
  eventType: string;
  category: string;
  payload: Record<string, unknown>;
  /** Template content per language, as stored; the provider renders it. */
  localizedContent: Record<string, unknown> | null;
  providerTemplateId: string | null;
}

/**
 * One implementation per external channel (push, sms, email). None is
 * registered yet: provider choice and India SMS template registration are open
 * (CFG-07, CFG-10), so deliveries on those channels are recorded as `skipped`.
 * `in_app` needs no provider: the inbox row is the delivery.
 */
export interface NotificationChannelProvider {
  readonly channel: Exclude<NotificationChannel, "in_app">;
  /** Returns the provider's reference for the sent message. */
  send(message: ChannelMessage): Promise<string | null>;
}

export const NOTIFICATION_CHANNEL_PROVIDERS = Symbol(
  "NOTIFICATION_CHANNEL_PROVIDERS",
);
export const NOTIFICATION_CREATED_EVENT = "notification.created";
