import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PoolClient } from "pg";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AuditService } from "../platform/audit.service";
import { StartConversationDto, SendMessageDto } from "./dto/message.dto";

interface ConversationRow {
  id: string;
  state: string;
  vendor_id: string;
  vendor_name: string;
  vendor_owner_id: string;
  last_message_at: Date | null;
  created_at: Date;
  listing_id: string | null;
}

const CONVERSATION_SELECT = `
  SELECT c.id, c.state, c.last_message_at, c.created_at,
         v.id AS vendor_id, v.owner_user_id AS vendor_owner_id,
         COALESCE(vp.trading_name, v.legal_name) AS vendor_name,
         (SELECT link.linked_resource_id FROM conversation_links AS link
          WHERE link.conversation_id = c.id AND link.linked_resource_type = 'listing'
          LIMIT 1) AS listing_id
  FROM conversations AS c
  JOIN conversation_links AS vl ON vl.conversation_id = c.id AND vl.linked_resource_type = 'vendor'
  JOIN vendors AS v ON v.id = vl.linked_resource_id
  LEFT JOIN vendor_profiles AS vp ON vp.vendor_id = v.id`;

const view = (row: ConversationRow, userId: string) => ({
  id: row.id,
  state: row.state,
  vendorId: row.vendor_id,
  vendorName: row.vendor_name,
  listingId: row.listing_id,
  viewerRole: row.vendor_owner_id === userId ? "vendor" : "customer",
  lastMessageAt: row.last_message_at,
  createdAt: row.created_at,
});

const scopes = ["phone", "email", "phone_and_email"] as const;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const phonePattern = /(?<![\w@])(?:\+?\d[\d\s().-]{7,}\d)(?![\w@])/g;

function filterContacts(body: string, allowed: Set<string>) {
  let filtered = false;
  let text = body;
  if (!allowed.has("email") && !allowed.has("phone_and_email")) {
    text = text.replace(emailPattern, () => { filtered = true; return "[email hidden]"; });
  }
  if (!allowed.has("phone") && !allowed.has("phone_and_email")) {
    text = text.replace(phonePattern, () => { filtered = true; return "[phone hidden]"; });
  }
  return { text, filtered };
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async start(user: AuthenticatedUser, request: StartConversationDto) {
    const id = await this.database.transaction(async (client) => {
      const vendor = await client.query<{ owner_user_id: string }>(
        `SELECT v.owner_user_id FROM vendors AS v
         WHERE v.id = $1 AND EXISTS (
           SELECT 1 FROM vendor_roles WHERE vendor_id = v.id AND status = 'verified')`,
        [request.vendorId],
      );
      const ownerId = vendor.rows[0]?.owner_user_id;
      if (!ownerId) throw new NotFoundException("No such public vendor");
      if (ownerId === user.userId) throw new BadRequestException("You cannot message your own vendor account");
      if (request.listingId) {
        const listing = await client.query(
          `SELECT 1 FROM listings WHERE id = $1 AND vendor_id = $2`,
          [request.listingId, request.vendorId],
        );
        if (listing.rowCount !== 1) throw new NotFoundException("No such vendor listing");
      }
      // Serialize starts for this customer and vendor so a double tap reuses one thread.
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`, [user.userId, request.vendorId]);
      const existing = await client.query<{ id: string }>(
        `SELECT c.id FROM conversations AS c
         JOIN conversation_links AS link ON link.conversation_id = c.id
           AND link.linked_resource_type = 'vendor' AND link.linked_resource_id = $2
         JOIN conversation_participants AS customer ON customer.conversation_id = c.id
           AND customer.user_id = $1 AND customer.left_at IS NULL
         JOIN conversation_participants AS owner ON owner.conversation_id = c.id
           AND owner.user_id = $3 AND owner.left_at IS NULL
         WHERE c.state = 'open' ORDER BY c.created_at LIMIT 1`,
        [user.userId, request.vendorId, ownerId],
      );
      if (existing.rows[0]) return existing.rows[0].id;
      const created = await client.query<{ id: string }>(
        `INSERT INTO conversations DEFAULT VALUES RETURNING id`,
      );
      const conversationId = created.rows[0].id;
      await client.query(
        `INSERT INTO conversation_links (conversation_id, linked_resource_type, linked_resource_id)
         VALUES ($1, 'vendor', $2)`, [conversationId, request.vendorId],
      );
      if (request.listingId) {
        await client.query(
          `INSERT INTO conversation_links (conversation_id, linked_resource_type, linked_resource_id)
           VALUES ($1, 'listing', $2)`, [conversationId, request.listingId],
        );
      }
      await client.query(
        `INSERT INTO conversation_participants (conversation_id, user_id)
         VALUES ($1, $2), ($1, $3)`, [conversationId, user.userId, ownerId],
      );
      return conversationId;
    });
    return this.get(user, id);
  }

  async list(user: AuthenticatedUser) {
    const result = await this.database.query<ConversationRow>(
      `${CONVERSATION_SELECT}
       JOIN conversation_participants AS mine ON mine.conversation_id = c.id
         AND mine.user_id = $1 AND mine.left_at IS NULL
       ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC`,
      [user.userId],
    );
    return { conversations: result.rows.map((row) => view(row, user.userId)) };
  }

  async get(user: AuthenticatedUser, id: string) {
    const result = await this.database.query<ConversationRow>(
      `${CONVERSATION_SELECT}
       JOIN conversation_participants AS mine ON mine.conversation_id = c.id
         AND mine.user_id = $2 AND mine.left_at IS NULL
       WHERE c.id = $1`,
      [id, user.userId],
    );
    if (!result.rows[0]) throw new NotFoundException("No such conversation");
    const messages = await this.database.query<{
      id: string; sender_user_id: string; body: string; contact_filtered: boolean; sent_at: Date;
    }>(
      `SELECT id, sender_user_id, body, contact_filtered, sent_at FROM messages
       WHERE conversation_id = $1 ORDER BY sent_at, id`, [id],
    );
    return {
      ...view(result.rows[0], user.userId),
      messages: messages.rows.map((message) => ({
        id: message.id,
        body: message.body,
        contactFiltered: message.contact_filtered,
        sentAt: message.sent_at,
        mine: message.sender_user_id === user.userId,
      })),
    };
  }

  async send(user: AuthenticatedUser, id: string, request: SendMessageDto) {
    const requestedBody = request.body.trim();
    if (!requestedBody) throw new BadRequestException("Message cannot be empty");
    const created = await this.database.transaction(async (client: PoolClient) => {
      const party = await client.query<{ recipient_user_id: string; state: string }>(
        `SELECT other.user_id AS recipient_user_id, c.state
         FROM conversations AS c
         JOIN conversation_participants AS mine ON mine.conversation_id = c.id
           AND mine.user_id = $2 AND mine.left_at IS NULL
         JOIN conversation_participants AS other ON other.conversation_id = c.id
           AND other.user_id <> $2 AND other.left_at IS NULL
         WHERE c.id = $1 FOR UPDATE OF c`, [id, user.userId],
      );
      if (!party.rows[0]) throw new NotFoundException("No such conversation");
      if (party.rows[0].state !== "open") throw new ConflictException("This conversation is closed");
      const consent = await client.query<{ scope: string }>(
        `SELECT scope FROM contact_share_consents
         WHERE conversation_id = $1 AND user_id = $2 AND revoked_at IS NULL`,
        [id, user.userId],
      );
      const body = filterContacts(requestedBody, new Set(consent.rows.map((row) => row.scope)));
      const inserted = await client.query<{ id: string; sent_at: Date }>(
        `INSERT INTO messages (conversation_id, sender_user_id, body, contact_filtered)
         VALUES ($1, $2, $3, $4) RETURNING id, sent_at`, [id, user.userId, body.text, body.filtered],
      );
      await client.query(`UPDATE conversations SET last_message_at = $2 WHERE id = $1`, [id, inserted.rows[0].sent_at]);
      await this.notifications.notify({
        recipientUserId: party.rows[0].recipient_user_id,
        eventType: "message.received",
        category: "messages",
        dedupeKey: `message:${inserted.rows[0].id}`,
        linkedResource: { type: "conversation", id },
      }, client);
      return { ...inserted.rows[0], ...body };
    });
    return { id: created.id, body: created.text, contactFiltered: created.filtered, sentAt: created.sent_at, mine: true };
  }

  private async requireParticipant(userId: string, conversationId: string, client: PoolClient) {
    const result = await client.query(
      `SELECT 1 FROM conversation_participants AS p
       JOIN conversations AS c ON c.id = p.conversation_id
       WHERE p.conversation_id = $1 AND p.user_id = $2 AND p.left_at IS NULL AND c.state = 'open'
       FOR UPDATE OF c`,
      [conversationId, userId],
    );
    if (!result.rowCount) throw new NotFoundException("No such open conversation");
  }

  async consents(user: AuthenticatedUser, id: string) {
    const participant = await this.database.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [id, user.userId],
    );
    if (!participant.rowCount) throw new NotFoundException("No such conversation");
    const result = await this.database.query<{ user_id: string; scope: string; granted_at: Date }>(
      `SELECT user_id, scope, granted_at FROM contact_share_consents
       WHERE conversation_id = $1 AND revoked_at IS NULL ORDER BY granted_at, user_id`, [id],
    );
    return { consents: result.rows.map((row) => ({ userId: row.user_id, scope: row.scope, grantedAt: row.granted_at })) };
  }

  async grantConsent(user: AuthenticatedUser, id: string, scope: string) {
    if (!scopes.includes(scope as typeof scopes[number])) throw new BadRequestException("Invalid contact scope");
    return this.database.transaction(async (client) => {
      await this.requireParticipant(user.userId, id, client);
      const result = await client.query<{ granted_at: Date }>(
        `INSERT INTO contact_share_consents (conversation_id, user_id, scope)
         VALUES ($1, $2, $3) ON CONFLICT (conversation_id, user_id, scope) WHERE revoked_at IS NULL
         DO UPDATE SET scope = EXCLUDED.scope RETURNING granted_at`, [id, user.userId, scope],
      );
      await this.audit.record({ actorUserId: user.userId, action: "contact_share.granted", targetType: "conversation", targetId: id, metadata: { scope } }, client);
      return { scope, grantedAt: result.rows[0].granted_at };
    });
  }

  async revokeConsent(user: AuthenticatedUser, id: string, scope: string) {
    if (!scopes.includes(scope as typeof scopes[number])) throw new BadRequestException("Invalid contact scope");
    return this.database.transaction(async (client) => {
      await this.requireParticipant(user.userId, id, client);
      const result = await client.query(
        `UPDATE contact_share_consents SET revoked_at = CURRENT_TIMESTAMP
         WHERE conversation_id = $1 AND user_id = $2 AND scope = $3 AND revoked_at IS NULL`,
        [id, user.userId, scope],
      );
      if (result.rowCount) await this.audit.record({ actorUserId: user.userId, action: "contact_share.revoked", targetType: "conversation", targetId: id, metadata: { scope } }, client);
      return { scope, revoked: Boolean(result.rowCount) };
    });
  }
}
