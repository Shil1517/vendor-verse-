import { Injectable, NotFoundException } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";

interface InvoiceRow {
  id: string; vendor_id: string; subscription_id: string | null; invoice_number: string;
  amount_minor: string; currency: string; tax_and_fee_details: Record<string, unknown>;
  status: string; document_file_id: string | null; issued_at: Date; created_at: Date;
}
const view = (r: InvoiceRow) => ({ id: r.id, vendorId: r.vendor_id, subscriptionId: r.subscription_id,
  invoiceNumber: r.invoice_number, amountMinor: r.amount_minor, currency: r.currency,
  taxAndFeeDetails: r.tax_and_fee_details, status: r.status, documentFileId: r.document_file_id,
  issuedAt: r.issued_at, createdAt: r.created_at });

@Injectable()
export class InvoicesService {
  constructor(private readonly database: DatabaseService) {}

  private async requireOwned(user: AuthenticatedUser, vendorId: string) {
    const owned = await this.database.query(`SELECT 1 FROM vendors WHERE id = $1 AND owner_user_id = $2`,
      [vendorId, user.userId]);
    if (!owned.rowCount) throw new NotFoundException("No such vendor for this user");
  }

  async listOwn(user: AuthenticatedUser, vendorId: string) {
    await this.requireOwned(user, vendorId);
    const rows = await this.database.query<InvoiceRow>(`SELECT * FROM invoices WHERE vendor_id = $1
      ORDER BY issued_at DESC, id DESC LIMIT 100`, [vendorId]);
    return { items: rows.rows.map(view) };
  }

  async getOwn(user: AuthenticatedUser, vendorId: string, invoiceId: string) {
    await this.requireOwned(user, vendorId);
    const rows = await this.database.query<InvoiceRow>(`SELECT * FROM invoices WHERE id = $1 AND vendor_id = $2`,
      [invoiceId, vendorId]);
    if (!rows.rows[0]) throw new NotFoundException("No such invoice");
    return view(rows.rows[0]);
  }

  async adminList() {
    const rows = await this.database.query<InvoiceRow>(`SELECT * FROM invoices ORDER BY issued_at DESC, id DESC LIMIT 100`);
    return { items: rows.rows.map(view) };
  }

  async adminGet(invoiceId: string) {
    const rows = await this.database.query<InvoiceRow>(`SELECT * FROM invoices WHERE id = $1`, [invoiceId]);
    if (!rows.rows[0]) throw new NotFoundException("No such invoice");
    return view(rows.rows[0]);
  }
}
