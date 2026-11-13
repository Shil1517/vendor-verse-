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
import {
  OpenPurchaseOrderDisputeDto,
  PurchaseOrderActionDto,
  ResolvePurchaseOrderDisputeDto,
} from "./dto/purchase-order.dto";

interface Queryable {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
}

interface AcceptedOrderTerms {
  snapshotId: string;
  customerUserId: string;
  vendorId: string;
  terms: Record<string, unknown>;
}

interface PurchaseOrderRow extends QueryResultRow {
  id: string;
  buyer_user_id: string;
  buyer_vendor_id: string | null;
  supplier_vendor_id: string;
  state: string;
  terms_snapshot: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

const ORDER_SELECT = `SELECT id, buyer_user_id, buyer_vendor_id,
  supplier_vendor_id, state, terms_snapshot, created_at, updated_at
  FROM purchase_orders`;

const toView = (row: PurchaseOrderRow) => ({
  id: row.id,
  buyerUserId: row.buyer_user_id,
  buyerVendorId: row.buyer_vendor_id,
  supplierVendorId: row.supplier_vendor_id,
  state: row.state,
  terms: row.terms_snapshot,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const TRANSITIONS = {
  accept: { from: "created", to: "accepted", party: "supplier" },
  reject: { from: "created", to: "rejected", party: "supplier" },
  process: { from: "accepted", to: "processing", party: "supplier" },
  ship: { from: "processing", to: "shipped", party: "supplier" },
  deliver: { from: "shipped", to: "delivered", party: "buyer" },
  complete: { from: "delivered", to: "completed", party: "buyer" },
  cancel: { from: "created", to: "cancelled", party: "either" },
  delivery_exception: { from: "shipped", to: "delivery_exception", party: "either" },
} as const;

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  async createFromAcceptedTerms(
    client: PoolClient,
    accepted: AcceptedOrderTerms,
  ) {
    const lines = accepted.terms.lines;
    if (!Array.isArray(lines) || lines.length === 0) {
      throw new ConflictException("A goods quote needs line items before it can create a purchase order");
    }
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO purchase_orders
         (accepted_terms_snapshot_id, buyer_user_id, supplier_vendor_id, terms_snapshot)
       VALUES ($1, $2, $3, $4::jsonb) RETURNING id`,
      [
        accepted.snapshotId,
        accepted.customerUserId,
        accepted.vendorId,
        JSON.stringify(accepted.terms),
      ],
    );
    const orderId = inserted.rows[0].id;
    let number = 1;
    for (const value of lines) {
      const line = this.parseLine(value, number);
      await client.query(
        `INSERT INTO po_lines
           (purchase_order_id, line_number, description, quantity, unit,
            unit_price_minor, currency, agreed_terms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
        [
          orderId,
          number,
          line.description,
          line.quantity,
          line.unit,
          line.unitPriceMinor,
          accepted.terms.currency,
          JSON.stringify({ lineTotalMinor: line.lineTotalMinor }),
        ],
      );
      number += 1;
    }
    await this.addEvent(client, orderId, accepted.customerUserId, "purchase_order.created", null, "created");
    await this.recordChange(client, accepted.customerUserId, orderId, "created", "created");
    return orderId;
  }

  async listMine(user: AuthenticatedUser) {
    const result = await this.database.query<PurchaseOrderRow>(
      `${ORDER_SELECT}
       WHERE buyer_user_id = $1 OR EXISTS (
         SELECT 1 FROM vendors
         WHERE vendors.owner_user_id = $1
           AND vendors.id IN (purchase_orders.buyer_vendor_id, purchase_orders.supplier_vendor_id)
       )
       ORDER BY created_at DESC, id`,
      [user.userId],
    );
    return { purchaseOrders: result.rows.map(toView) };
  }

  async listForVendor(user: AuthenticatedUser, vendorId: string) {
    await this.requireVendorOwner(this.database, vendorId, user.userId);
    const result = await this.database.query<PurchaseOrderRow>(
      `${ORDER_SELECT}
       WHERE (supplier_vendor_id = $1 OR buyer_vendor_id = $1)
         AND EXISTS (SELECT 1 FROM vendors WHERE id = $1 AND owner_user_id = $2)
       ORDER BY created_at DESC, id`,
      [vendorId, user.userId],
    );
    return { purchaseOrders: result.rows.map(toView) };
  }

  async get(user: AuthenticatedUser, orderId: string) {
    const result = await this.database.query<PurchaseOrderRow>(
      `${ORDER_SELECT}
       WHERE id = $1 AND (
         buyer_user_id = $2 OR EXISTS (
           SELECT 1 FROM vendors
           WHERE vendors.owner_user_id = $2
             AND vendors.id IN (purchase_orders.buyer_vendor_id, purchase_orders.supplier_vendor_id)
         )
       )`,
      [orderId, user.userId],
    );
    if (!result.rows[0]) throw new NotFoundException("No such purchase order");
    const lines = await this.database.query(
      `SELECT line_number, catalog_item_id, description, quantity, unit,
         unit_price_minor, currency, agreed_terms
       FROM po_lines WHERE purchase_order_id = $1 ORDER BY line_number`,
      [orderId],
    );
    const shipments = await this.database.query(
      `SELECT id, status, delivery_region, carrier, tracking_reference,
         shipped_at, delivered_at, created_at
       FROM shipments WHERE purchase_order_id = $1 ORDER BY created_at, id`,
      [orderId],
    );
    return { ...toView(result.rows[0]), lines: lines.rows, shipments: shipments.rows };
  }

  async act(user: AuthenticatedUser, orderId: string, request: PurchaseOrderActionDto) {
    return this.database.transaction(async (client) => {
      const order = await this.lockPartyOrder(client, orderId, user.userId);
      const transition = TRANSITIONS[request.action];
      const allowedFrom =
        request.action === "cancel"
          ? ["created", "accepted", "processing"]
          : request.action === "delivery_exception"
            ? ["shipped", "delivered"]
            : [transition.from];
      if (!allowedFrom.includes(order.state)) {
        throw new ConflictException(`A ${order.state} purchase order cannot ${request.action}`);
      }
      if (
        transition.party !== "either" &&
        order.party !== transition.party
      ) {
        throw new NotFoundException("No such purchase order for this user");
      }
      if (transition.party === "either" && !["buyer", "supplier"].includes(order.party)) {
        throw new NotFoundException("No such purchase order for this user");
      }
      if (["reject", "cancel", "delivery_exception"].includes(request.action) && !request.reason) {
        throw new BadRequestException("A reason is required for this action");
      }
      if (request.action === "ship") {
        await client.query(
          `INSERT INTO shipments
             (purchase_order_id, status, delivery_region, carrier,
              tracking_reference, shipped_at)
           VALUES ($1, 'in_transit', $2, $3, $4, CURRENT_TIMESTAMP)`,
          [
            orderId,
            request.deliveryRegion ?? null,
            request.carrier ?? null,
            request.trackingReference ?? null,
          ],
        );
      }
      if (request.action === "deliver") {
        const shipment = await client.query(
          `UPDATE shipments SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP
           WHERE purchase_order_id = $1 AND status = 'in_transit'
           RETURNING id`,
          [orderId],
        );
        if (!shipment.rowCount) {
          throw new ConflictException("The purchase order has no in-transit shipment");
        }
      }
      if (request.action === "delivery_exception") {
        const shipment = await client.query(
          `UPDATE shipments SET status = 'exception'
           WHERE purchase_order_id = $1 AND status IN ('pending', 'in_transit', 'delivered')
           RETURNING id`,
          [orderId],
        );
        if (!shipment.rowCount) {
          throw new ConflictException("The purchase order has no active shipment to mark as an exception");
        }
      }
      await client.query(`UPDATE purchase_orders SET state = $2 WHERE id = $1`, [
        orderId,
        transition.to,
      ]);
      await client.query(
        `INSERT INTO po_events
           (purchase_order_id, actor_user_id, event_type, from_state, to_state, details)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          orderId,
          user.userId,
          `purchase_order.${request.action}`,
          order.state,
          transition.to,
          JSON.stringify({
            reason: request.reason,
            deliveryRegion: request.deliveryRegion,
            carrier: request.carrier,
            trackingReference: request.trackingReference,
          }),
        ],
      );
      await this.recordChange(client, user.userId, orderId, request.action, transition.to);
      return this.getWithin(client, user.userId, orderId);
    });
  }

  async openDispute(
    user: AuthenticatedUser,
    orderId: string,
    request: OpenPurchaseOrderDisputeDto,
  ) {
    return this.database.transaction(async (client) => {
      const order = await this.lockPartyOrder(client, orderId, user.userId);
      if (!["delivered", "completed", "delivery_exception"].includes(order.state)) {
        throw new ConflictException("A dispute can be opened only for an order that reached delivery");
      }
      const supportCase = await client.query(
        `SELECT 1 FROM support_cases
         WHERE id = $1 AND transaction_type = 'purchase_order'
           AND transaction_id = $2`,
        [request.supportCaseId, orderId],
      );
      if (supportCase.rowCount !== 1) {
        throw new BadRequestException("supportCaseId is not linked to this purchase order");
      }
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO po_disputes (purchase_order_id, support_case_id)
         VALUES ($1, $2) RETURNING id`,
        [orderId, request.supportCaseId],
      );
      await this.recordChange(client, user.userId, orderId, "dispute_opened", order.state);
      return { id: inserted.rows[0].id, purchaseOrderId: orderId, outcome: null };
    });
  }

  async resolveDispute(
    user: AuthenticatedUser,
    disputeId: string,
    request: ResolvePurchaseOrderDisputeDto,
  ) {
    return this.database.transaction(async (client) => {
      const found = await client.query<{
        id: string;
        purchase_order_id: string;
        buyer_user_id: string;
        buyer_vendor_id: string | null;
        supplier_vendor_id: string;
        resolved_at: Date | null;
      }>(
        `SELECT dispute.id, dispute.purchase_order_id, order_row.buyer_user_id,
           order_row.buyer_vendor_id, order_row.supplier_vendor_id,
           support_case.resolved_at
         FROM po_disputes AS dispute
         JOIN purchase_orders AS order_row ON order_row.id = dispute.purchase_order_id
         JOIN support_cases AS support_case ON support_case.id = dispute.support_case_id
         WHERE dispute.id = $1 FOR UPDATE OF dispute, order_row`,
        [disputeId],
      );
      const row = found.rows[0];
      if (!row) throw new NotFoundException("No such purchase order dispute");
      const isBuyer = row.buyer_user_id === user.userId ||
        (row.buyer_vendor_id !== null && await this.isVendorOwner(client, row.buyer_vendor_id, user.userId));
      const isSupplier = await this.isVendorOwner(client, row.supplier_vendor_id, user.userId);
      if (!isBuyer && !isSupplier) throw new NotFoundException("No such purchase order dispute for this user");
      if (!row.resolved_at) {
        throw new ConflictException("The linked support case must be resolved before recording an outcome");
      }
      const updated = await client.query(
        `UPDATE po_disputes SET outcome = $2, resolved_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND outcome IS NULL`,
        [disputeId, request.outcome],
      );
      if (updated.rowCount !== 1) throw new ConflictException("This dispute already has an outcome");
      await this.recordChange(client, user.userId, row.purchase_order_id, "dispute_resolved", request.outcome);
      return { id: disputeId, purchaseOrderId: row.purchase_order_id, outcome: request.outcome };
    });
  }

  private parseLine(value: unknown, lineNumber: number) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new BadRequestException(`Quote line ${lineNumber} is invalid`);
    }
    const line = value as Record<string, unknown>;
    const description = typeof line.description === "string" ? line.description.trim() : "";
    const quantity = line.quantity;
    const unitPriceMinor = line.unitPriceMinor;
    const lineTotalMinor = line.lineTotalMinor;
    if (
      !description ||
      typeof quantity !== "number" ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      typeof unitPriceMinor !== "number" ||
      !Number.isSafeInteger(unitPriceMinor) ||
      unitPriceMinor < 0 ||
      typeof lineTotalMinor !== "number" ||
      !Number.isSafeInteger(lineTotalMinor) ||
      lineTotalMinor < 0
    ) {
      throw new BadRequestException(`Quote line ${lineNumber} has invalid terms`);
    }
    return {
      description,
      quantity,
      unit: typeof line.unit === "string" ? line.unit : null,
      unitPriceMinor,
      lineTotalMinor,
    };
  }

  private async lockPartyOrder(client: Queryable, orderId: string, userId: string) {
    const result = await client.query<{
      id: string;
      state: string;
      buyer_user_id: string;
      buyer_vendor_id: string | null;
      supplier_vendor_id: string;
      party: "buyer" | "supplier";
    }>(
      `SELECT order_row.id, order_row.state, order_row.buyer_user_id,
         order_row.buyer_vendor_id, order_row.supplier_vendor_id,
         CASE
           WHEN order_row.buyer_user_id = $2 OR buyer.owner_user_id = $2 THEN 'buyer'
           ELSE 'supplier'
         END AS party
       FROM purchase_orders AS order_row
       LEFT JOIN vendors AS buyer ON buyer.id = order_row.buyer_vendor_id
       JOIN vendors AS supplier ON supplier.id = order_row.supplier_vendor_id
       WHERE order_row.id = $1 AND (
         order_row.buyer_user_id = $2 OR buyer.owner_user_id = $2
         OR supplier.owner_user_id = $2
       ) FOR UPDATE OF order_row`,
      [orderId, userId],
    );
    if (!result.rows[0]) throw new NotFoundException("No such purchase order");
    return result.rows[0];
  }

  private async getWithin(client: Queryable, userId: string, orderId: string) {
    const result = await client.query<PurchaseOrderRow>(
      `${ORDER_SELECT}
       WHERE id = $1 AND (
         buyer_user_id = $2 OR EXISTS (
           SELECT 1 FROM vendors
           WHERE vendors.owner_user_id = $2
             AND vendors.id IN (purchase_orders.buyer_vendor_id, purchase_orders.supplier_vendor_id)
         )
       )`,
      [orderId, userId],
    );
    if (!result.rows[0]) throw new NotFoundException("No such purchase order");
    return toView(result.rows[0]);
  }

  private async requireVendorOwner(client: Queryable, vendorId: string, userId: string) {
    if (!(await this.isVendorOwner(client, vendorId, userId))) {
      throw new NotFoundException("No such vendor for this user");
    }
  }

  private async isVendorOwner(client: Queryable, vendorId: string, userId: string) {
    const result = await client.query(
      `SELECT 1 FROM vendors WHERE id = $1 AND owner_user_id = $2`,
      [vendorId, userId],
    );
    return result.rowCount === 1;
  }

  private async addEvent(
    client: Queryable,
    orderId: string,
    actorUserId: string,
    eventType: string,
    fromState: string | null,
    toState: string | null,
  ) {
    await client.query(
      `INSERT INTO po_events
         (purchase_order_id, actor_user_id, event_type, from_state, to_state)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, actorUserId, eventType, fromState, toState],
    );
  }

  private async recordChange(
    client: PoolClient,
    userId: string,
    orderId: string,
    action: string,
    state: string,
  ) {
    await this.audit.record(
      {
        actorUserId: userId,
        action: `purchase_order.${action}`,
        targetType: "purchase_order",
        targetId: orderId,
        metadata: { state },
      },
      client,
    );
    await this.outbox.enqueue(
      { aggregateType: "purchase_order", aggregateId: orderId, eventType: `purchase_order.${action}` },
      client,
    );
  }
}
