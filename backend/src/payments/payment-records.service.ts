import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PoolClient } from "pg";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { CreatePaymentRecordDto, PaymentRecordQueryDto } from "./dto/payment-record.dto";

type ParentType = PaymentRecordQueryDto["parentType"];
const parents: Record<ParentType, { column: string; partyQuery: string }> = {
  booking: {
    column: "booking_id",
    partyQuery: `SELECT b.state, b.customer_user_id AS buyer_id, v.owner_user_id AS vendor_id
      FROM bookings AS b JOIN vendors AS v ON v.id = b.vendor_id WHERE b.id = $1`,
  },
  purchase_order: {
    column: "purchase_order_id",
    partyQuery: `SELECT p.state, p.buyer_user_id AS buyer_id, v.owner_user_id AS vendor_id
      FROM purchase_orders AS p JOIN vendors AS v ON v.id = p.supplier_vendor_id WHERE p.id = $1`,
  },
  contract: {
    column: "contract_id",
    partyQuery: `SELECT c.state, c.customer_user_id AS buyer_id, v.owner_user_id AS vendor_id
      FROM contracts AS c JOIN vendors AS v ON v.id = c.vendor_id WHERE c.id = $1`,
  },
  accepted_terms: {
    column: "accepted_terms_snapshot_id",
    partyQuery: `SELECT 'accepted' AS state, r.customer_user_id AS buyer_id, v.owner_user_id AS vendor_id
      FROM accepted_terms_snapshots AS a JOIN rfqs AS r ON r.id = a.rfq_id
      JOIN quotes AS q ON q.id = a.quote_id JOIN vendors AS v ON v.id = q.vendor_id
      WHERE a.id = $1`,
  },
};
const eligibleStates: Record<ParentType, string[]> = {
  booking: ["confirmed", "in_progress", "completed_awaiting", "closed"],
  purchase_order: ["accepted", "processing", "shipped", "delivered", "completed"],
  contract: ["active", "completed", "closed"],
  accepted_terms: ["accepted"],
};

interface PartyRow { state: string; buyer_id: string; vendor_id: string }
interface RecordRow {
  id: string; mode: string; amount_minor: string; currency: string; status: string;
  external_reference: string | null; terms_snapshot: Record<string, unknown>;
  recorded_by_user_id: string; created_at: Date; updated_at: Date;
}
const project = (row: RecordRow) => ({
  id: row.id, mode: row.mode, amountMinor: row.amount_minor, currency: row.currency,
  status: row.status, externalReference: row.external_reference,
  termsSnapshot: row.terms_snapshot, recordedByUserId: row.recorded_by_user_id,
  createdAt: row.created_at, updatedAt: row.updated_at,
});

@Injectable()
export class PaymentRecordsService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  private async role(user: AuthenticatedUser, parent: PaymentRecordQueryDto, client?: PoolClient) {
    const source = parents[parent.parentType];
    if (!source) throw new BadRequestException("Invalid parent type");
    const result = client
      ? await client.query<PartyRow>(source.partyQuery, [parent.parentId])
      : await this.database.query<PartyRow>(source.partyQuery, [parent.parentId]);
    const row = result.rows[0];
    if (!row) throw new NotFoundException("No such transaction");
    if (row.vendor_id === user.userId) return { role: "vendor", state: row.state };
    if (row.buyer_id === user.userId) return { role: "buyer", state: row.state };
    throw new NotFoundException("No such transaction");
  }

  async list(user: AuthenticatedUser, parent: PaymentRecordQueryDto) {
    await this.role(user, parent);
    const column = parents[parent.parentType].column;
    const result = await this.database.query<RecordRow>(
      `SELECT id, mode, amount_minor, currency, status, external_reference,
              terms_snapshot, recorded_by_user_id, created_at, updated_at
       FROM payment_records WHERE ${column} = $1 ORDER BY created_at DESC, id DESC LIMIT 100`,
      [parent.parentId],
    );
    return { items: result.rows.map(project) };
  }

  async create(user: AuthenticatedUser, request: CreatePaymentRecordDto) {
    const currency = request.currency.trim().toUpperCase();
    const status = request.status.trim();
    if (!/^[A-Z]{3}$/.test(currency)) throw new BadRequestException("Currency must be a three-letter code");
    if (!status) throw new BadRequestException("Status is required");
    if (request.externalReference !== undefined && !request.externalReference.trim()) throw new BadRequestException("External reference cannot be blank");
    return this.database.transaction(async (client) => {
      const party = await this.role(user, request, client);
      if (!eligibleStates[request.parentType].includes(party.state)) throw new ConflictException("Transaction terms are not agreed");
      if (request.mode === "A" && party.role !== "vendor") {
        throw new ForbiddenException("Only the vendor can record a direct-payment receipt");
      }
      const column = parents[request.parentType].column;
      const result = await client.query<RecordRow>(
        `INSERT INTO payment_records
           (mode, ${column}, amount_minor, currency, status, external_reference, terms_snapshot, recorded_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
         RETURNING id, mode, amount_minor, currency, status, external_reference,
                   terms_snapshot, recorded_by_user_id, created_at, updated_at`,
        [request.mode, request.parentId, request.amountMinor, currency, status,
          request.externalReference?.trim() ?? null, JSON.stringify(request.termsSnapshot ?? {}), user.userId],
      );
      await this.audit.record({
        actorUserId: user.userId, action: "payment_record.created", targetType: "payment_record",
        targetId: result.rows[0].id,
        metadata: { mode: request.mode, parentType: request.parentType, parentId: request.parentId },
      }, client);
      return project(result.rows[0]);
    });
  }
}
