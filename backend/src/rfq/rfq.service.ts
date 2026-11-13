import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PoolClient, QueryResult, QueryResultRow } from "pg";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { OutboxService } from "../platform/outbox.service";
import { BookingsService } from "../bookings/bookings.service";
import { ContractsService } from "../contracts/contracts.service";
import { PurchaseOrdersService } from "../orders/purchase-orders.service";
import { FilesService } from "../files/files.service";
import {
  CreateQuoteDto,
  CreateRfqDto,
  OpenRfqDto,
  QuoteRevisionDto,
  ReviseRfqDto,
} from "./dto/rfq.dto";
import { WorkOrderActionDto } from "./dto/work-order.dto";

interface RfqRow {
  id: string;
  customer_user_id: string;
  category_id: string;
  kind: "service" | "goods";
  state: string;
  current_revision: number;
  quote_deadline_at: Date | null;
  requirements: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface QuoteRow {
  id: string;
  rfq_id: string;
  vendor_id: string;
  current_revision: number;
  state: string;
  currency: string;
  total_minor: string;
  scope: string | null;
  inclusions: string[];
  exclusions: string[];
  timeline: Record<string, unknown>;
  terms: Record<string, unknown>;
  valid_until: Date | null;
  lines: Array<{
    description: string;
    quantity: number;
    unit: string | null;
    unitPriceMinor: number;
    lineTotalMinor: number;
  }>;
  created_at: Date;
}

const RFQ_FIELDS = `request.id, request.customer_user_id, request.category_id,
  request.kind, request.state, request.current_revision,
  request.quote_deadline_at, revision.requirements,
  request.created_at, request.updated_at`;
const QUOTE_FIELDS = `quote.id, quote.rfq_id, quote.vendor_id,
  quote.current_revision, quote.state, revision.currency,
  revision.total_minor, revision.scope, revision.inclusions,
  revision.exclusions, revision.timeline, revision.terms,
  revision.valid_until,
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'description', line.description,
      'quantity', line.quantity,
      'unit', line.unit,
      'unitPriceMinor', line.unit_price_minor,
      'lineTotalMinor', line.line_total_minor
    ) ORDER BY line.line_number)
    FROM quote_lines AS line WHERE line.quote_revision_id = revision.id
  ), '[]'::jsonb) AS lines,
  quote.created_at`;

interface Queryable {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: Array<string | number | boolean | Date | string[] | null>,
  ): Promise<QueryResult<Row>>;
}

@Injectable()
export class RfqService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly bookings: BookingsService,
    private readonly contracts: ContractsService,
    private readonly purchaseOrders: PurchaseOrdersService,
    private readonly files: FilesService,
  ) {}

  async create(user: AuthenticatedUser, request: CreateRfqDto) {
    await this.assertAttachmentFiles(user, request.fileIds ?? []);
    return this.database.transaction(async (client) => {
      const category = await client.query<{
        current_version: number;
      }>(
        `SELECT current_version FROM categories
         WHERE id = $1 AND lifecycle = 'ACTIVE'`,
        [request.categoryId],
      );
      const configVersion = category.rows[0]?.current_version;
      if (configVersion === undefined) {
        throw new BadRequestException("categoryId is not an active category");
      }
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO rfqs (customer_user_id, category_id, kind)
         VALUES ($1, $2, $3) RETURNING id`,
        [user.userId, request.categoryId, request.kind],
      );
      const rfqId = inserted.rows[0].id;
      const revision = await client.query<{ id: string }>(
        `INSERT INTO rfq_revisions
           (rfq_id, revision_number, requirements, category_config_version,
            created_by_user_id)
         VALUES ($1, 1, $2::jsonb, $3, $4) RETURNING id`,
        [
          rfqId,
          JSON.stringify(request.requirements),
          configVersion,
          user.userId,
        ],
      );
      await this.attachFiles(client, revision.rows[0].id, request.fileIds ?? []);
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "rfq.create",
          targetType: "rfq",
          targetId: rfqId,
          metadata: { categoryId: request.categoryId, kind: request.kind },
        },
        client,
      );
      await this.outbox.enqueue(
        { aggregateType: "rfq", aggregateId: rfqId, eventType: "rfq.created" },
        client,
      );
      return this.getForCustomer(client, rfqId, user.userId);
    });
  }

  async listMine(user: AuthenticatedUser) {
    const result = await this.database.query<RfqRow>(
      `SELECT ${RFQ_FIELDS}
       FROM rfqs AS request
       JOIN rfq_revisions AS revision
         ON revision.rfq_id = request.id
        AND revision.revision_number = request.current_revision
       WHERE request.customer_user_id = $1
       ORDER BY request.updated_at DESC, request.id DESC`,
      [user.userId],
    );
    return { rfqs: result.rows.map(toRfqView) };
  }

  async listForVendor(user: AuthenticatedUser, vendorId: string) {
    await this.requireOwnedVendor(this.database, vendorId, user.userId);
    const result = await this.database.query<RfqRow>(
      `SELECT ${RFQ_FIELDS}
       FROM rfq_recipients AS recipient
       JOIN vendors AS vendor
         ON vendor.id = recipient.vendor_id
        AND vendor.owner_user_id = $2
       JOIN rfqs AS request ON request.id = recipient.rfq_id
       JOIN rfq_revisions AS revision
         ON revision.rfq_id = request.id
        AND revision.revision_number = request.current_revision
       WHERE recipient.vendor_id = $1
       ORDER BY request.updated_at DESC, request.id DESC`,
      [vendorId, user.userId],
    );
    return { rfqs: result.rows.map(toRfqView) };
  }

  async get(user: AuthenticatedUser, rfqId: string) {
    const result = await this.database.query<RfqRow>(
      `SELECT ${RFQ_FIELDS}
       FROM rfqs AS request
       JOIN rfq_revisions AS revision
         ON revision.rfq_id = request.id
        AND revision.revision_number = request.current_revision
       WHERE request.id = $1
         AND (
           request.customer_user_id = $2
           OR EXISTS (
             SELECT 1
             FROM rfq_recipients AS recipient
             JOIN vendors AS vendor ON vendor.id = recipient.vendor_id
             WHERE recipient.rfq_id = request.id
               AND vendor.owner_user_id = $2
           )
         )`,
      [rfqId, user.userId],
    );
    if (!result.rows[0]) throw new NotFoundException("No such RFQ");
    return toRfqView(result.rows[0]);
  }

  async open(
    user: AuthenticatedUser,
    rfqId: string,
    request: OpenRfqDto,
  ) {
    const deadline = new Date(request.quoteDeadlineAt);
    if (deadline <= new Date()) {
      throw new BadRequestException("quoteDeadlineAt must be in the future");
    }
    const vendorIds = [...new Set(request.vendorIds)];
    return this.database.transaction(async (client) => {
      const rfq = await this.lockCustomerRfq(client, rfqId, user.userId);
      if (rfq.state !== "draft") {
        throw new ConflictException("Only a draft RFQ can be opened");
      }
      const eligible = await client.query<{ id: string }>(
        `SELECT vendor.id
         FROM vendors AS vendor
         JOIN users AS owner ON owner.id = vendor.owner_user_id
         WHERE vendor.id = ANY($1::uuid[])
           AND owner.account_status = 'active'
           AND EXISTS (
             SELECT 1 FROM vendor_categories AS vendor_category
             WHERE vendor_category.vendor_id = vendor.id
               AND vendor_category.category_id = $2
           )
           AND EXISTS (
             SELECT 1 FROM vendor_roles AS vendor_role
             WHERE vendor_role.vendor_id = vendor.id
               AND vendor_role.status = 'verified'
           )`,
        [vendorIds, rfq.category_id],
      );
      if (eligible.rowCount !== vendorIds.length) {
        throw new BadRequestException(
          "Every recipient must be an active, verified vendor in the RFQ category",
        );
      }
      await client.query(
        `INSERT INTO rfq_recipients (rfq_id, vendor_id, delivery_state)
         SELECT $1, UNNEST($2::uuid[]), 'delivered'`,
        [rfqId, vendorIds],
      );
      const current = await client.query<{
        requirements: Record<string, unknown>;
        category_config_version: number;
      }>(
        `SELECT requirements, category_config_version
         FROM rfq_revisions
         WHERE rfq_id = $1 AND revision_number = $2`,
        [rfqId, rfq.current_revision],
      );
      const nextRevision = rfq.current_revision + 1;
      const revision = await client.query<{ id: string }>(
        `INSERT INTO rfq_revisions
           (rfq_id, revision_number, requirements, category_config_version,
            quote_deadline_at, created_by_user_id, change_reason)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7)
         RETURNING id`,
        [
          rfqId,
          nextRevision,
          JSON.stringify(current.rows[0].requirements),
          current.rows[0].category_config_version,
          deadline,
          user.userId,
          "RFQ opened",
        ],
      );
      await this.copyRevisionFiles(client, rfqId, rfq.current_revision, revision.rows[0].id);
      await client.query(
        `UPDATE rfqs
         SET state = 'open', quote_deadline_at = $2, current_revision = $3
         WHERE id = $1`,
        [rfqId, deadline, nextRevision],
      );
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "rfq.open",
          targetType: "rfq",
          targetId: rfqId,
          metadata: { vendorCount: vendorIds.length },
        },
        client,
      );
      await this.outbox.enqueue(
        { aggregateType: "rfq", aggregateId: rfqId, eventType: "rfq.opened" },
        client,
      );
      return this.getForCustomer(client, rfqId, user.userId);
    });
  }

  async revise(
    user: AuthenticatedUser,
    rfqId: string,
    request: ReviseRfqDto,
  ) {
    await this.assertAttachmentFiles(user, request.fileIds ?? []);
    return this.database.transaction(async (client) => {
      const current = await this.lockCustomerRfq(client, rfqId, user.userId);
      if (!["draft", "open"].includes(current.state)) {
        throw new ConflictException(
          `A ${current.state} RFQ can no longer be revised`,
        );
      }
      if (
        current.state === "open" &&
        (!current.quote_deadline_at ||
          current.quote_deadline_at <= new Date())
      ) {
        throw new ConflictException("This RFQ is no longer accepting revisions");
      }
      if (request.quoteDeadlineAt) {
        const deadline = new Date(request.quoteDeadlineAt);
        if (deadline <= new Date()) {
          throw new BadRequestException("quoteDeadlineAt must be in the future");
        }
      }
      const nextRevision = current.current_revision + 1;
      const config = await client.query<{ category_config_version: number }>(
        `SELECT category_config_version FROM rfq_revisions
         WHERE rfq_id = $1 AND revision_number = $2`,
        [rfqId, current.current_revision],
      );
      const revision = await client.query<{ id: string }>(
        `INSERT INTO rfq_revisions
           (rfq_id, revision_number, requirements, category_config_version,
            quote_deadline_at, created_by_user_id, change_reason)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7) RETURNING id`,
        [
          rfqId,
          nextRevision,
          JSON.stringify(request.requirements),
          config.rows[0].category_config_version,
          request.quoteDeadlineAt ?? current.quote_deadline_at,
          user.userId,
          request.changeReason,
        ],
      );
      if (request.fileIds === undefined) {
        await this.copyRevisionFiles(client, rfqId, current.current_revision, revision.rows[0].id);
      } else {
        await this.attachFiles(client, revision.rows[0].id, request.fileIds);
      }
      await client.query(
        `UPDATE rfqs SET current_revision = $2,
           quote_deadline_at = COALESCE($3, quote_deadline_at)
         WHERE id = $1`,
        [rfqId, nextRevision, request.quoteDeadlineAt ?? null],
      );
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "rfq.revise",
          targetType: "rfq",
          targetId: rfqId,
          reason: request.changeReason,
          metadata: { revision: nextRevision },
        },
        client,
      );
      await this.outbox.enqueue(
        { aggregateType: "rfq", aggregateId: rfqId, eventType: "rfq.revised" },
        client,
      );
      return this.getForCustomer(client, rfqId, user.userId);
    });
  }

  async extendDeadline(
    user: AuthenticatedUser,
    rfqId: string,
    quoteDeadlineAt: string,
  ) {
    const deadline = new Date(quoteDeadlineAt);
    if (deadline <= new Date()) {
      throw new BadRequestException("quoteDeadlineAt must be in the future");
    }
    return this.database.transaction(async (client) => {
      const current = await this.lockCustomerRfq(client, rfqId, user.userId);
      if (current.state !== "open") {
        throw new ConflictException("Only an open RFQ deadline can be extended");
      }
      if (
        !current.quote_deadline_at ||
        current.quote_deadline_at <= new Date()
      ) {
        throw new ConflictException("This RFQ deadline has already passed");
      }
      if (
        current.quote_deadline_at &&
        deadline <= current.quote_deadline_at
      ) {
        throw new BadRequestException(
          "quoteDeadlineAt must be later than the current deadline",
        );
      }
      const revision = await client.query<{ id: string }>(
        `INSERT INTO rfq_revisions
           (rfq_id, revision_number, requirements, category_config_version,
            quote_deadline_at, created_by_user_id, change_reason)
         SELECT request.id, request.current_revision + 1, revision.requirements,
                revision.category_config_version, $2, $3, 'Deadline extended'
         FROM rfqs AS request
         JOIN rfq_revisions AS revision
           ON revision.rfq_id = request.id
          AND revision.revision_number = request.current_revision
         WHERE request.id = $1
         RETURNING id`,
        [rfqId, deadline, user.userId],
      );
      await this.copyRevisionFiles(client, rfqId, current.current_revision, revision.rows[0].id);
      await client.query(
        `UPDATE rfqs
         SET quote_deadline_at = $2, current_revision = current_revision + 1
         WHERE id = $1`,
        [rfqId, deadline],
      );
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "rfq.deadline_extend",
          targetType: "rfq",
          targetId: rfqId,
        },
        client,
      );
      await this.outbox.enqueue(
        {
          aggregateType: "rfq",
          aggregateId: rfqId,
          eventType: "rfq.deadline_extended",
        },
        client,
      );
      return this.getForCustomer(client, rfqId, user.userId);
    });
  }

  async listQuotes(user: AuthenticatedUser, rfqId: string) {
    const rfq = await this.get(user, rfqId);
    const result = await this.database.query<QuoteRow>(
      `SELECT ${QUOTE_FIELDS}
       FROM quotes AS quote
       JOIN quote_revisions AS revision
         ON revision.quote_id = quote.id
        AND revision.revision_number = quote.current_revision
       WHERE quote.rfq_id = $1
         AND (
           $2::uuid = (SELECT customer_user_id FROM rfqs WHERE id = $1)
           OR EXISTS (
             SELECT 1 FROM vendors AS vendor
             WHERE vendor.id = quote.vendor_id
               AND vendor.owner_user_id = $2
           )
         )
       ORDER BY quote.created_at, quote.id`,
      [rfqId, user.userId],
    );
    return { rfq, quotes: result.rows.map(toQuoteView) };
  }

  async expire(user: AuthenticatedUser, rfqId: string) {
    return this.database.transaction(async (client) => {
      const rfq = await this.lockCustomerRfq(client, rfqId, user.userId);
      if (rfq.state !== "open" || !rfq.quote_deadline_at) {
        throw new ConflictException("Only an open RFQ can expire");
      }
      if (rfq.quote_deadline_at > new Date()) {
        throw new ConflictException("The RFQ deadline has not passed");
      }
      await client.query(
        `UPDATE quotes SET state = 'expired'
         WHERE rfq_id = $1 AND state = 'submitted'`,
        [rfqId],
      );
      await client.query(`UPDATE rfqs SET state = 'expired' WHERE id = $1`, [rfqId]);
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "rfq.expire",
          targetType: "rfq",
          targetId: rfqId,
        },
        client,
      );
      await this.outbox.enqueue(
        { aggregateType: "rfq", aggregateId: rfqId, eventType: "rfq.expired" },
        client,
      );
      return this.getForCustomer(client, rfqId, user.userId);
    });
  }

  async vendorSuggestions(user: AuthenticatedUser, rfqId: string) {
    const owned = await this.database.query<{ state: string }>(
      `SELECT state FROM rfqs WHERE id = $1 AND customer_user_id = $2`,
      [rfqId, user.userId],
    );
    if (!owned.rows[0]) throw new NotFoundException("No such RFQ");
    if (owned.rows[0].state !== "expired") {
      throw new ConflictException("Vendor suggestions are available after the RFQ expires");
    }
    const result = await this.database.query<{ id: string }>(
      `SELECT vendor.id
       FROM rfqs AS request
       JOIN vendors AS vendor ON TRUE
       JOIN users AS owner ON owner.id = vendor.owner_user_id
       WHERE request.id = $1 AND request.customer_user_id = $2
         AND NOT EXISTS (
           SELECT 1 FROM quotes WHERE quotes.rfq_id = request.id
         )
         AND owner.account_status = 'active'
         AND EXISTS (
           SELECT 1 FROM vendor_categories AS vendor_category
           WHERE vendor_category.vendor_id = vendor.id
             AND vendor_category.category_id = request.category_id
         )
         AND EXISTS (
           SELECT 1 FROM vendor_roles AS vendor_role
           WHERE vendor_role.vendor_id = vendor.id AND vendor_role.status = 'verified'
         )
         AND NOT EXISTS (
           SELECT 1 FROM rfq_recipients AS recipient
           WHERE recipient.rfq_id = request.id AND recipient.vendor_id = vendor.id
         )
       ORDER BY vendor.id`,
      [rfqId, user.userId],
    );
    return { vendorIds: result.rows.map((row) => row.id) };
  }

  async submitQuote(
    user: AuthenticatedUser,
    rfqId: string,
    request: CreateQuoteDto,
  ) {
    return this.database.transaction(async (client) => {
      const rfq = await client.query<{
        state: string;
        quote_deadline_at: Date | null;
        kind: "goods" | "service";
      }>(
        `SELECT state, quote_deadline_at, kind FROM rfqs WHERE id = $1 FOR UPDATE`,
        [rfqId],
      );
      const rfqRow = rfq.rows[0];
      if (!rfqRow) throw new NotFoundException("No such RFQ");
      if (
        rfqRow.state !== "open" ||
        !rfqRow.quote_deadline_at ||
        rfqRow.quote_deadline_at <= new Date()
      ) {
        throw new ConflictException("This RFQ is not accepting quotes");
      }
      this.validateQuoteLines(request, rfqRow.kind === "goods");
      await this.requireOwnedVendor(client, request.vendorId, user.userId);
      const recipient = await client.query(
        `SELECT 1 FROM rfq_recipients
         WHERE rfq_id = $1 AND vendor_id = $2`,
        [rfqId, request.vendorId],
      );
      if (recipient.rowCount !== 1) {
        throw new NotFoundException("No such RFQ for this vendor");
      }
      const quote = await client.query<{ id: string }>(
        `INSERT INTO quotes (rfq_id, vendor_id)
         VALUES ($1, $2) RETURNING id`,
        [rfqId, request.vendorId],
      );
      await this.insertQuoteRevision(
        client,
        quote.rows[0].id,
        1,
        request,
      );
      await client.query(
        `UPDATE rfq_recipients SET delivery_state = 'viewed'
         WHERE rfq_id = $1 AND vendor_id = $2`,
        [rfqId, request.vendorId],
      );
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "quote.submit",
          targetType: "quote",
          targetId: quote.rows[0].id,
          metadata: { rfqId },
        },
        client,
      );
      await this.outbox.enqueue(
        {
          aggregateType: "rfq",
          aggregateId: rfqId,
          eventType: "quote.submitted",
          payload: { quoteId: quote.rows[0].id },
        },
        client,
      );
      return this.getQuote(client, quote.rows[0].id);
    });
  }

  async reviseQuote(
    user: AuthenticatedUser,
    quoteId: string,
    request: QuoteRevisionDto,
  ) {
    return this.database.transaction(async (client) => {
      const current = await client.query<{
        rfq_id: string;
        vendor_id: string;
        current_revision: number;
        state: string;
        kind: "goods" | "service";
      }>(
        `SELECT quote.rfq_id, quote.vendor_id, quote.current_revision, quote.state,
                rfq.kind
         FROM quotes AS quote
         JOIN rfqs AS rfq ON rfq.id = quote.rfq_id
         JOIN vendors AS vendor ON vendor.id = quote.vendor_id
         WHERE quote.id = $1 AND vendor.owner_user_id = $2
         FOR UPDATE OF quote`,
        [quoteId, user.userId],
      );
      const row = current.rows[0];
      if (!row) throw new NotFoundException("No such quote for this vendor");
      if (row.state !== "submitted") {
        throw new ConflictException(`A ${row.state} quote cannot be revised`);
      }
      this.validateQuoteLines(request, row.kind === "goods");
      const rfq = await client.query<{
        state: string;
        quote_deadline_at: Date | null;
      }>(
        `SELECT state, quote_deadline_at FROM rfqs WHERE id = $1 FOR UPDATE`,
        [row.rfq_id],
      );
      if (
        rfq.rows[0]?.state !== "open" ||
        !rfq.rows[0].quote_deadline_at ||
        rfq.rows[0].quote_deadline_at <= new Date()
      ) {
        throw new ConflictException("This RFQ is no longer accepting quotes");
      }
      const nextRevision = row.current_revision + 1;
      await this.insertQuoteRevision(client, quoteId, nextRevision, request);
      await client.query(
        `UPDATE quotes SET current_revision = $2 WHERE id = $1`,
        [quoteId, nextRevision],
      );
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "quote.revise",
          targetType: "quote",
          targetId: quoteId,
          metadata: { revision: nextRevision },
        },
        client,
      );
      await this.outbox.enqueue(
        {
          aggregateType: "rfq",
          aggregateId: row.rfq_id,
          eventType: "quote.revised",
          payload: { quoteId },
        },
        client,
      );
      return this.getQuote(client, quoteId);
    });
  }

  async withdrawQuote(user: AuthenticatedUser, quoteId: string) {
    return this.database.transaction(async (client) => {
      const result = await client.query<{ rfq_id: string }>(
        `UPDATE quotes AS quote SET state = 'withdrawn'
         FROM vendors AS vendor
         WHERE quote.id = $1 AND vendor.id = quote.vendor_id
           AND vendor.owner_user_id = $2 AND quote.state = 'submitted'
           AND EXISTS (
             SELECT 1 FROM rfqs AS request
             WHERE request.id = quote.rfq_id AND request.state = 'open'
               AND request.quote_deadline_at > CURRENT_TIMESTAMP
           )
         RETURNING quote.rfq_id`,
        [quoteId, user.userId],
      );
      if (!result.rows[0]) {
        throw new NotFoundException("No submitted quote for this vendor");
      }
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "quote.withdraw",
          targetType: "quote",
          targetId: quoteId,
        },
        client,
      );
      await this.outbox.enqueue(
        {
          aggregateType: "rfq",
          aggregateId: result.rows[0].rfq_id,
          eventType: "quote.withdrawn",
          payload: { quoteId },
        },
        client,
      );
      return { id: quoteId, state: "withdrawn" };
    });
  }

  async acceptQuote(
    user: AuthenticatedUser,
    rfqId: string,
    quoteId: string,
  ) {
    return this.database.transaction(async (client) => {
      const rfq = await this.lockCustomerRfq(client, rfqId, user.userId);
      if (rfq.state !== "open") {
        throw new ConflictException("Only an open RFQ can accept a quote");
      }

      if (!rfq.quote_deadline_at || rfq.quote_deadline_at <= new Date()) {
        throw new ConflictException("This RFQ is no longer accepting quotes");
      }
      const quote = await client.query<{
        current_revision: number;
        state: string;
        vendor_id: string;
        revision_id: string;
        currency: string;
        total_minor: string;
        scope: string | null;
        inclusions: string[];
        exclusions: string[];
        timeline: Record<string, unknown>;
        terms: Record<string, unknown>;
      }>(
        `SELECT quote.current_revision, quote.state, quote.vendor_id,
                revision.id AS revision_id,
                revision.currency, revision.total_minor, revision.scope,
                revision.inclusions, revision.exclusions, revision.timeline,
                revision.terms
         FROM quotes AS quote
         JOIN quote_revisions AS revision
           ON revision.quote_id = quote.id
          AND revision.revision_number = quote.current_revision
         WHERE quote.id = $1 AND quote.rfq_id = $2
         FOR UPDATE OF quote`,
        [quoteId, rfqId],
      );
      const row = quote.rows[0];
      if (!row) throw new NotFoundException("No such quote for this RFQ");
      if (row.state !== "submitted") {
        throw new ConflictException("Only a submitted quote can be accepted");
      }
      const currentRfq = await client.query<{
        requirements: Record<string, unknown>;
        configuration: Record<string, unknown>;
      }>(
        `SELECT revision.requirements, config.configuration
         FROM rfqs AS request
         JOIN rfq_revisions AS revision
           ON revision.rfq_id = request.id
          AND revision.revision_number = request.current_revision
         JOIN category_config_versions AS config
           ON config.category_id = request.category_id
          AND config.version_number = revision.category_config_version
         WHERE request.id = $1`,
        [rfqId],
      );
      if (!currentRfq.rows[0]) {
        throw new ConflictException("The RFQ's category configuration is unavailable");
      }
      const fulfillmentType =
        rfq.kind === "goods"
          ? "purchase_order"
          : currentRfq.rows[0].configuration.rfqFulfillmentType;
      if (
        rfq.kind === "service" &&
        !["booking", "work_order", "contract"].includes(String(fulfillmentType))
      ) {
        throw new ConflictException(
          "Configure rfqFulfillmentType as booking, work_order, or contract for this service category",
        );
      }
      const quoteLines = await client.query<{
        description: string;
        quantity: string;
        unit: string | null;
        unit_price_minor: string;
        line_total_minor: string;
      }>(
        `SELECT description, quantity, unit, unit_price_minor, line_total_minor
         FROM quote_lines WHERE quote_revision_id = $1 ORDER BY line_number`,
        [row.revision_id],
      );
      const snapshot = {
        scope: row.scope,
        inclusions: row.inclusions,
        exclusions: row.exclusions,
        timeline: row.timeline,
        terms: row.terms,
        totalMinor: Number(row.total_minor),
        currency: row.currency,
        lines: quoteLines.rows.map((line) => ({
          description: line.description,
          quantity: Number(line.quantity),
          unit: line.unit,
          unitPriceMinor: Number(line.unit_price_minor),
          lineTotalMinor: Number(line.line_total_minor),
        })),
      };
      const accepted = await client.query<{ id: string }>(
        `INSERT INTO accepted_terms_snapshots
           (rfq_id, quote_id, quote_revision_id, immutable_terms,
            accepted_by_user_id)
         SELECT $1, quote.id, revision.id, $4::jsonb, $3
         FROM quotes AS quote
         JOIN quote_revisions AS revision
           ON revision.quote_id = quote.id
          AND revision.revision_number = quote.current_revision
         WHERE quote.id = $2
         RETURNING id`,
        [
          rfqId,
          quoteId,
          user.userId,
          JSON.stringify(snapshot),
        ],
      );
      const acceptedTermsSnapshotId = accepted.rows[0].id;
      let fulfillment: { type: string; id: string };
      if (fulfillmentType === "purchase_order") {
        const orderId = await this.purchaseOrders.createFromAcceptedTerms(client, {
          snapshotId: acceptedTermsSnapshotId,
          customerUserId: user.userId,
          vendorId: row.vendor_id,
          terms: snapshot,
        });
        fulfillment = { type: "purchase_order", id: orderId };
      } else if (fulfillmentType === "contract") {
        const templateId = currentRfq.rows[0].configuration.approvedContractTemplateId;
        if (typeof templateId !== "string" || !templateId.trim()) {
          throw new ConflictException(
            "The category must configure approvedContractTemplateId before an RFQ can create a contract",
          );
        }
        const contractId = await this.contracts.createFromAcceptedTerms(client, {
          snapshotId: acceptedTermsSnapshotId,
          customerUserId: user.userId,
          vendorId: row.vendor_id,
          categoryId: rfq.category_id,
          approvedTemplateId: templateId,
          terms: snapshot,
        });
        fulfillment = { type: "contract", id: contractId };
      } else if (fulfillmentType === "booking") {
        const listingId = currentRfq.rows[0].requirements.listingId;
        if (typeof listingId !== "string") {
          throw new ConflictException(
            "The RFQ requirements must include listingId for booking fulfillment",
          );
        }
        const bookingId = await this.bookings.createFromAcceptedTerms(client, {
          snapshotId: acceptedTermsSnapshotId,
          customerUserId: user.userId,
          vendorId: row.vendor_id,
          listingId,
          terms: snapshot,
        });
        fulfillment = { type: "booking", id: bookingId };
      } else {
        const workOrder = await client.query<{ id: string }>(
          `INSERT INTO work_orders
             (accepted_terms_snapshot_id, customer_user_id, vendor_id, scope)
           VALUES ($1, $2, $3, $4::jsonb) RETURNING id`,
          [
            acceptedTermsSnapshotId,
            user.userId,
            row.vendor_id,
            JSON.stringify(snapshot),
          ],
        );
        fulfillment = { type: "work_order", id: workOrder.rows[0].id };
        await this.audit.record(
          {
            actorUserId: user.userId,
            action: "work_order.create_from_rfq",
            targetType: "work_order",
            targetId: fulfillment.id,
            metadata: { rfqId, quoteId },
          },
          client,
        );
        await this.outbox.enqueue(
          {
            aggregateType: "work_order",
            aggregateId: fulfillment.id,
            eventType: "work_order.created",
          },
          client,
        );
      }
      await client.query(
        `UPDATE rfqs SET state = 'accepted' WHERE id = $1`,
        [rfqId],
      );
      await client.query(
        `UPDATE quotes
         SET state = CASE WHEN id = $2 THEN 'accepted' ELSE 'unsuccessful' END
         WHERE rfq_id = $1 AND state = 'submitted'`,
        [rfqId, quoteId],
      );
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "quote.accept",
          targetType: "rfq",
          targetId: rfqId,
          metadata: { quoteId, acceptedTermsSnapshotId, fulfillment },
        },
        client,
      );
      await this.outbox.enqueue(
        {
          aggregateType: "rfq",
          aggregateId: rfqId,
          eventType: "quote.accepted",
          payload: {
            quoteId,
            acceptedTermsSnapshotId,
            fulfillment,
          },
        },
        client,
      );
      return {
        rfqId,
        quoteId,
        acceptedTermsSnapshotId,
        fulfillment,
        terms: snapshot,
      };
    });
  }

  async listWorkOrders(user: AuthenticatedUser) {
    const result = await this.database.query(
      `SELECT work_order.id, work_order.customer_user_id, work_order.vendor_id,
         work_order.state, work_order.scope, work_order.completed_at,
         work_order.confirmation_due_at, work_order.created_at, work_order.updated_at
       FROM work_orders AS work_order
       WHERE work_order.customer_user_id = $1 OR EXISTS (
         SELECT 1 FROM vendors
         WHERE vendors.id = work_order.vendor_id AND vendors.owner_user_id = $1
       )
       ORDER BY work_order.created_at DESC, work_order.id`,
      [user.userId],
    );
    return { workOrders: result.rows };
  }

  async listWorkOrdersForVendor(user: AuthenticatedUser, vendorId: string) {
    await this.requireOwnedVendor(this.database, vendorId, user.userId);
    const result = await this.database.query(
      `SELECT id, customer_user_id, vendor_id, state, scope, completed_at,
         confirmation_due_at, created_at, updated_at
       FROM work_orders WHERE vendor_id = $1 ORDER BY created_at DESC, id`,
      [vendorId],
    );
    return { workOrders: result.rows };
  }

  async getWorkOrder(user: AuthenticatedUser, workOrderId: string) {
    const result = await this.database.query(
      `SELECT work_order.id, work_order.customer_user_id, work_order.vendor_id,
         work_order.state, work_order.scope, work_order.completed_at,
         work_order.confirmation_due_at, work_order.created_at, work_order.updated_at
       FROM work_orders AS work_order
       WHERE work_order.id = $1 AND (
         work_order.customer_user_id = $2 OR EXISTS (
           SELECT 1 FROM vendors
           WHERE vendors.id = work_order.vendor_id AND vendors.owner_user_id = $2
         )
       )`,
      [workOrderId, user.userId],
    );
    if (!result.rows[0]) throw new NotFoundException("No such work order");
    return result.rows[0];
  }

  async actWorkOrder(
    user: AuthenticatedUser,
    workOrderId: string,
    request: WorkOrderActionDto,
  ) {
    return this.database.transaction(async (client) => {
      const result = await client.query<{
        id: string;
        customer_user_id: string;
        vendor_id: string;
        state: string;
        party: "customer" | "vendor";
      }>(
        `SELECT work_order.id, work_order.customer_user_id, work_order.vendor_id,
           work_order.state,
           CASE WHEN work_order.customer_user_id = $2 THEN 'customer' ELSE 'vendor' END AS party
         FROM work_orders AS work_order
         WHERE work_order.id = $1 AND (
           work_order.customer_user_id = $2 OR EXISTS (
             SELECT 1 FROM vendors
             WHERE vendors.id = work_order.vendor_id AND vendors.owner_user_id = $2
           )
         ) FOR UPDATE`,
        [workOrderId, user.userId],
      );
      const workOrder = result.rows[0];
      if (!workOrder) throw new NotFoundException("No such work order");
      const transitions = {
        start: { from: "created", to: "in_progress", party: "vendor" },
        complete: { from: "in_progress", to: "completed_awaiting", party: "vendor" },
        confirm: { from: "completed_awaiting", to: "closed", party: "customer" },
        cancel: { from: ["created", "in_progress"], to: "cancelled", party: "either" },
      } as const;
      const transition = transitions[request.action];
      const validFrom = Array.isArray(transition.from)
        ? transition.from.includes(workOrder.state as "created" | "in_progress")
        : transition.from === workOrder.state;
      if (!validFrom) {
        throw new ConflictException(`A ${workOrder.state} work order cannot ${request.action}`);
      }
      if (transition.party !== "either" && workOrder.party !== transition.party) {
        throw new NotFoundException("No such work order for this user");
      }
      if (request.action === "complete") {
        await client.query(
          `UPDATE work_orders SET state = $2, completed_at = CURRENT_TIMESTAMP,
             confirmation_due_at = CURRENT_TIMESTAMP + INTERVAL '7 days'
           WHERE id = $1`,
          [workOrderId, transition.to],
        );
      } else if (request.action === "confirm") {
        await client.query(
          `UPDATE work_orders SET state = $2, closed_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [workOrderId, transition.to],
        );
      } else {
        await client.query(
          `UPDATE work_orders SET state = $2 WHERE id = $1`,
          [workOrderId, transition.to],
        );
      }
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: `work_order.${request.action}`,
          targetType: "work_order",
          targetId: workOrderId,
          metadata: { from: workOrder.state, to: transition.to },
        },
        client,
      );
      await this.outbox.enqueue(
        {
          aggregateType: "work_order",
          aggregateId: workOrderId,
          eventType: `work_order.${request.action}`,
        },
        client,
      );
      return { id: workOrderId, state: transition.to };
    });
  }

  async closeOverdueWorkOrders() {
    return this.database.transaction(async (client) => {
      const closed = await client.query<{ id: string }>(
        `UPDATE work_orders SET state = 'closed', closed_at = CURRENT_TIMESTAMP
         WHERE state = 'completed_awaiting'
           AND confirmation_due_at <= CURRENT_TIMESTAMP
         RETURNING id`,
      );
      for (const row of closed.rows) {
        await this.audit.record(
          {
            actorService: "work-order-scheduler",
            action: "work_order.auto_closed",
            targetType: "work_order",
            targetId: row.id,
          },
          client,
        );
        await this.outbox.enqueue(
          { aggregateType: "work_order", aggregateId: row.id, eventType: "work_order.auto_closed" },
          client,
        );
      }
      return closed.rowCount ?? 0;
    });
  }

  private async insertQuoteRevision(
    client: PoolClient,
    quoteId: string,
    revision: number,
    request: CreateQuoteDto | QuoteRevisionDto,
  ) {
    const insertedRevision = await client.query<{ id: string }>(
      `INSERT INTO quote_revisions
         (quote_id, revision_number, currency, total_minor, scope,
          inclusions, exclusions, timeline, terms, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb,
               $8::jsonb, $9::jsonb, $10)
       RETURNING id`,
      [
        quoteId,
        revision,
        request.currency,
        request.totalMinor,
        request.scope ?? null,
        JSON.stringify(request.inclusions ?? []),
        JSON.stringify(request.exclusions ?? []),
        JSON.stringify(request.timeline ?? {}),
        JSON.stringify(request.terms ?? {}),
        request.validUntil ?? null,
      ],
    );
    for (let index = 0; index < (request.lines ?? []).length; index += 1) {
      const line = request.lines![index];
      await client.query(
        `INSERT INTO quote_lines
           (quote_revision_id, line_number, description, quantity, unit,
            unit_price_minor, line_total_minor)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          insertedRevision.rows[0].id,
          index + 1,
          line.description,
          line.quantity,
          line.unit ?? null,
          line.unitPriceMinor,
          line.lineTotalMinor,
        ],
      );
    }
  }

  private async assertAttachmentFiles(user: AuthenticatedUser, fileIds: string[]) {
    if (new Set(fileIds).size !== fileIds.length) {
      throw new BadRequestException("fileIds must not contain duplicates");
    }
    const files = await Promise.all(fileIds.map((fileId) => this.files.get(user, fileId)));
    if (files.some((file) => !file.uploaded || file.scanStatus !== "clean" || file.purpose !== "rfq-attachment")) {
      throw new BadRequestException("RFQ attachments must be uploaded, clean rfq-attachment files owned by the caller");
    }
  }

  private async attachFiles(client: PoolClient, revisionId: string, fileIds: string[]) {
    if (fileIds.length === 0) return;
    await client.query(
      `INSERT INTO rfq_revision_files (rfq_revision_id, file_id)
       SELECT $1, UNNEST($2::uuid[])`,
      [revisionId, fileIds],
    );
  }

  private async copyRevisionFiles(
    client: PoolClient,
    rfqId: string,
    previousRevision: number,
    revisionId: string,
  ) {
    await client.query(
      `INSERT INTO rfq_revision_files (rfq_revision_id, file_id)
       SELECT $1, files.file_id
       FROM rfq_revision_files AS files
       JOIN rfq_revisions AS revision ON revision.id = files.rfq_revision_id
       WHERE revision.rfq_id = $2 AND revision.revision_number = $3`,
      [revisionId, rfqId, previousRevision],
    );
  }

  private validateQuoteLines(request: CreateQuoteDto | QuoteRevisionDto, required: boolean) {
    const lines = request.lines ?? [];
    if (required && lines.length === 0) {
      throw new BadRequestException("Goods quotes must include at least one line");
    }
    if (lines.length === 0) return;
    let total = 0;
    for (const [index, line] of lines.entries()) {
      const quantityMilli = Math.round(line.quantity * 1000);
      if (Math.abs(line.quantity - quantityMilli / 1000) > 1e-10) {
        throw new BadRequestException(`Quote line ${index + 1} quantity supports at most three decimals`);
      }
      const extended = BigInt(line.unitPriceMinor) * BigInt(quantityMilli);
      if (extended % 1000n !== 0n || extended / 1000n !== BigInt(line.lineTotalMinor)) {
        throw new BadRequestException(`Quote line ${index + 1} total does not match quantity and unit price`);
      }
      total += line.lineTotalMinor;
      if (!Number.isSafeInteger(total)) {
        throw new BadRequestException("Quote line total exceeds the supported safe integer range");
      }
    }
    if (total !== request.totalMinor) {
      throw new BadRequestException("Quote line totals must equal totalMinor");
    }
  }

  private async getForCustomer(
    client: PoolClient,
    rfqId: string,
    userId: string,
  ) {
    const result = await client.query<RfqRow>(
      `SELECT ${RFQ_FIELDS}
       FROM rfqs AS request
       JOIN rfq_revisions AS revision
         ON revision.rfq_id = request.id
        AND revision.revision_number = request.current_revision
       WHERE request.id = $1 AND request.customer_user_id = $2`,
      [rfqId, userId],
    );
    if (!result.rows[0]) throw new NotFoundException("No such RFQ");
    return toRfqView(result.rows[0]);
  }

  private async lockCustomerRfq(
    client: PoolClient,
    rfqId: string,
    userId: string,
  ) {
    const result = await client.query<{
      id: string;
      category_id: string;
      kind: "goods" | "service";
      state: string;
      current_revision: number;
      quote_deadline_at: Date | null;
    }>(
      `SELECT id, category_id, kind, state, current_revision, quote_deadline_at
       FROM rfqs
       WHERE id = $1 AND customer_user_id = $2
       FOR UPDATE`,
      [rfqId, userId],
    );
    if (!result.rows[0]) throw new NotFoundException("No such RFQ");
    return result.rows[0];
  }

  private async requireOwnedVendor(
    client: Queryable,
    vendorId: string,
    userId: string,
  ) {
    const owned = await client.query(
      `SELECT 1 FROM vendors WHERE id = $1 AND owner_user_id = $2`,
      [vendorId, userId],
    );
    if (owned.rowCount !== 1) {
      throw new NotFoundException("No such vendor for this user");
    }
  }

  private async getQuote(client: PoolClient, quoteId: string) {
    const result = await client.query<QuoteRow>(
      `SELECT ${QUOTE_FIELDS}
       FROM quotes AS quote
       JOIN quote_revisions AS revision
         ON revision.quote_id = quote.id
        AND revision.revision_number = quote.current_revision
       WHERE quote.id = $1`,
      [quoteId],
    );
    if (!result.rows[0]) throw new NotFoundException("No such quote");
    return toQuoteView(result.rows[0]);
  }
}

function toRfqView(row: RfqRow) {
  return {
    id: row.id,
    categoryId: row.category_id,
    kind: row.kind,
    state: row.state,
    currentRevision: row.current_revision,
    quoteDeadlineAt: row.quote_deadline_at?.toISOString() ?? null,
    requirements: row.requirements,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function toQuoteView(row: QuoteRow) {
  return {
    id: row.id,
    rfqId: row.rfq_id,
    vendorId: row.vendor_id,
    currentRevision: row.current_revision,
    state: row.state,
    currency: row.currency,
    totalMinor: Number(row.total_minor),
    scope: row.scope,
    inclusions: row.inclusions,
    exclusions: row.exclusions,
    timeline: row.timeline,
    terms: row.terms,
    lines: row.lines ?? [],
    validUntil: row.valid_until?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}
