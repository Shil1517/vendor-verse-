import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { CreateReportDto, DecideAppealDto, OpenCaseDto, ReportTarget, UpdateCaseDto } from "./dto/case.dto";

const targetQueries: Record<ReportTarget, string> = {
  vendor: `SELECT 1 FROM vendors v WHERE v.id = $1 AND EXISTS
    (SELECT 1 FROM vendor_roles vr WHERE vr.vendor_id = v.id AND vr.status = 'verified')`,
  listing: `SELECT 1 FROM listings l JOIN vendors v ON v.id = l.vendor_id
    WHERE l.id = $1 AND l.content_state = 'approved' AND EXISTS
    (SELECT 1 FROM vendor_roles vr WHERE vr.vendor_id = v.id AND vr.status = 'verified')`,
  booking: `SELECT 1 FROM bookings b JOIN vendors v ON v.id = b.vendor_id
    WHERE b.id = $1 AND (b.customer_user_id = $2 OR v.owner_user_id = $2)`,
  work_order: `SELECT 1 FROM work_orders w JOIN vendors v ON v.id = w.vendor_id
    WHERE w.id = $1 AND (w.customer_user_id = $2 OR v.owner_user_id = $2)`,
  purchase_order: `SELECT 1 FROM purchase_orders p JOIN vendors v ON v.id = p.supplier_vendor_id
    WHERE p.id = $1 AND (p.buyer_user_id = $2 OR v.owner_user_id = $2)`,
  contract: `SELECT 1 FROM contracts c JOIN vendors v ON v.id = c.vendor_id
    WHERE c.id = $1 AND (c.customer_user_id = $2 OR v.owner_user_id = $2)`,
  conversation: `SELECT 1 FROM conversation_participants
    WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
};
const transactionTargets = new Set(["booking", "work_order", "purchase_order", "contract"]);
interface ReportRow {
  id: string; reporter_user_id: string; target_type: string; target_id: string;
  reason: string; details: string | null; created_at: Date; case_id?: string | null;
}
interface CaseRow {
  id: string; report_id: string | null; opened_by_user_id: string; subject: string;
  severity: string; state: string; assigned_staff_user_id: string | null;
  sla_due_at: Date | null; resolution: string | null; resolved_at: Date | null;
  transaction_type: string | null; transaction_id: string | null;
  created_at: Date; updated_at: Date;
}
interface AppealRow {
  id: string; case_id: string; appellant_user_id: string; reviewer_user_id: string | null;
  status: string; outcome: string | null; reason: string | null;
  created_at: Date; decided_at: Date | null;
}
const reportView = (r: ReportRow) => ({ id: r.id, targetType: r.target_type, targetId: r.target_id,
  reason: r.reason, details: r.details, caseId: r.case_id ?? null, createdAt: r.created_at });
const caseView = (c: CaseRow) => ({ id: c.id, reportId: c.report_id, subject: c.subject, severity: c.severity,
  state: c.state, assignedStaffUserId: c.assigned_staff_user_id, slaDueAt: c.sla_due_at,
  resolution: c.resolution, resolvedAt: c.resolved_at, transactionType: c.transaction_type,
  transactionId: c.transaction_id, createdAt: c.created_at, updatedAt: c.updated_at });
const appealView = (a: AppealRow) => ({ id: a.id, caseId: a.case_id, status: a.status,
  outcome: a.outcome, reason: a.reason, createdAt: a.created_at, decidedAt: a.decided_at });

@Injectable()
export class CasesService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  async report(user: AuthenticatedUser, body: CreateReportDto) {
    const reason = body.reason.trim();
    if (!reason || (body.details !== undefined && !body.details.trim())) throw new BadRequestException("Reason and details cannot be blank");
    const query = targetQueries[body.targetType];
    if (!query) throw new BadRequestException("Invalid report target");
    return this.database.transaction(async (client) => {
      const values = body.targetType === "vendor" || body.targetType === "listing"
        ? [body.targetId] : [body.targetId, user.userId];
      const target = await client.query(query, values);
      if (!target.rowCount) throw new NotFoundException("No reportable target for this user");
      const inserted = await client.query<ReportRow>(
        `INSERT INTO reports (reporter_user_id, target_type, target_id, reason, details)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [user.userId, body.targetType, body.targetId, reason, body.details?.trim() ?? null],
      );
      await this.audit.record({ actorUserId: user.userId, action: "report.created", targetType: "report", targetId: inserted.rows[0].id }, client);
      return reportView(inserted.rows[0]);
    });
  }

  async myReports(user: AuthenticatedUser) {
    const found = await this.database.query<ReportRow>(
      `SELECT r.*, c.id AS case_id FROM reports r LEFT JOIN support_cases c ON c.report_id = r.id
       WHERE r.reporter_user_id = $1 ORDER BY r.created_at DESC, r.id DESC LIMIT 100`, [user.userId],
    );
    return { items: found.rows.map(reportView) };
  }

  async reportQueue() {
    const found = await this.database.query<ReportRow>(
      `SELECT r.*, c.id AS case_id FROM reports r LEFT JOIN support_cases c ON c.report_id = r.id
       ORDER BY r.created_at DESC, r.id DESC LIMIT 100`,
    );
    return { items: found.rows.map(reportView) };
  }

  async open(actor: AuthenticatedUser, reportId: string, body: OpenCaseDto) {
    const subject = body.subject.trim();
    const severity = body.severity.trim();
    if (!subject || !severity) throw new BadRequestException("Subject and severity are required");
    return this.database.transaction(async (client) => {
      const found = await client.query<ReportRow>(`SELECT * FROM reports WHERE id = $1 FOR UPDATE`, [reportId]);
      const report = found.rows[0];
      if (!report) throw new NotFoundException("No such report");
      const existing = await client.query(`SELECT 1 FROM support_cases WHERE report_id = $1`, [reportId]);
      if (existing.rowCount) throw new ConflictException("A case already exists for this report");
      const created = await client.query<CaseRow>(
        `INSERT INTO support_cases
          (report_id, opened_by_user_id, transaction_type, transaction_id, subject, severity, sla_due_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [reportId, report.reporter_user_id, transactionTargets.has(report.target_type) ? report.target_type : null,
          transactionTargets.has(report.target_type) ? report.target_id : null, subject, severity,
          body.slaDueAt ? new Date(body.slaDueAt) : null],
      );
      const c = created.rows[0];
      await client.query(`INSERT INTO case_actions (case_id, actor_user_id, action, reason) VALUES ($1, $2, 'opened', $3)`,
        [c.id, actor.userId, report.reason]);
      await this.audit.record({ actorUserId: actor.userId, action: "case.opened", targetType: "case", targetId: c.id }, client);
      return caseView(c);
    });
  }

  async myCases(user: AuthenticatedUser) {
    const found = await this.database.query<CaseRow>(
      `SELECT * FROM support_cases WHERE opened_by_user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 100`, [user.userId],
    );
    return { items: found.rows.map(caseView) };
  }

  async queue() {
    const found = await this.database.query<CaseRow>(
      `SELECT * FROM support_cases ORDER BY (resolved_at IS NOT NULL), sla_due_at NULLS LAST, created_at LIMIT 100`,
    );
    return { items: found.rows.map(caseView) };
  }

  async getForUser(user: AuthenticatedUser, id: string) {
    const found = await this.database.query<CaseRow>(`SELECT * FROM support_cases WHERE id = $1 AND opened_by_user_id = $2`, [id, user.userId]);
    if (!found.rows[0]) throw new NotFoundException("No such case");
    return caseView(found.rows[0]);
  }

  async getForAdmin(id: string) {
    const found = await this.database.query<CaseRow>(`SELECT * FROM support_cases WHERE id = $1`, [id]);
    if (!found.rows[0]) throw new NotFoundException("No such case");
    return caseView(found.rows[0]);
  }

  async update(actor: AuthenticatedUser, id: string, body: UpdateCaseDto) {
    const reason = body.reason.trim();
    if (!reason) throw new BadRequestException("Reason is required");
    if (![body.severity, body.state, body.assignedStaffUserId, body.slaDueAt, body.resolution].some((v) => v !== undefined)) {
      throw new BadRequestException("At least one case field is required");
    }
    if ([body.severity, body.state, body.resolution].some((v) => v !== undefined && !v.trim())) {
      throw new BadRequestException("Case fields cannot be blank");
    }
    if (body.resolution !== undefined && body.state === undefined) {
      throw new BadRequestException("A resolved case needs an explicit state");
    }
    return this.database.transaction(async (client) => {
      const found = await client.query<CaseRow>(`SELECT * FROM support_cases WHERE id = $1 FOR UPDATE`, [id]);
      if (!found.rows[0]) throw new NotFoundException("No such case");
      const updated = await client.query<CaseRow>(
        `UPDATE support_cases SET severity = COALESCE($2, severity), state = COALESCE($3, state),
          assigned_staff_user_id = COALESCE($4, assigned_staff_user_id),
          sla_due_at = COALESCE($5, sla_due_at), resolution = COALESCE($6, resolution),
          resolved_at = CASE WHEN $6::text IS NOT NULL THEN CURRENT_TIMESTAMP ELSE resolved_at END
         WHERE id = $1 RETURNING *`,
        [id, body.severity?.trim() ?? null, body.state?.trim() ?? null, body.assignedStaffUserId ?? null,
          body.slaDueAt ? new Date(body.slaDueAt) : null, body.resolution?.trim() ?? null],
      );
      await client.query(`INSERT INTO case_actions (case_id, actor_user_id, action, reason) VALUES ($1, $2, 'updated', $3)`, [id, actor.userId, reason]);
      await this.audit.record({ actorUserId: actor.userId, action: "case.updated", targetType: "case", targetId: id, reason,
        metadata: { fields: Object.keys(body).filter((key) => key !== "reason") } }, client);
      return caseView(updated.rows[0]);
    });
  }

  async appeal(user: AuthenticatedUser, caseId: string, reasonInput: string) {
    const reason = reasonInput.trim();
    if (!reason) throw new BadRequestException("Reason is required");
    return this.database.transaction(async (client) => {
      const found = await client.query<CaseRow>(
        `SELECT * FROM support_cases WHERE id = $1 AND opened_by_user_id = $2 FOR UPDATE`, [caseId, user.userId],
      );
      if (!found.rows[0]) throw new NotFoundException("No such case");
      if (!found.rows[0].resolved_at) throw new ConflictException("A case can be appealed after a resolution");
      const active = await client.query(`SELECT 1 FROM appeals WHERE case_id = $1 AND status = 'submitted'`, [caseId]);
      if (active.rowCount) throw new ConflictException("An appeal is already pending");
      const created = await client.query<AppealRow>(
        `INSERT INTO appeals (case_id, appellant_user_id, reason) VALUES ($1, $2, $3) RETURNING *`,
        [caseId, user.userId, reason],
      );
      await this.audit.record({ actorUserId: user.userId, action: "case.appealed", targetType: "case", targetId: caseId }, client);
      return appealView(created.rows[0]);
    });
  }

  async appealQueue() {
    const found = await this.database.query<AppealRow>(
      `SELECT * FROM appeals WHERE status = 'submitted' ORDER BY created_at, id LIMIT 100`,
    );
    return { items: found.rows.map(appealView) };
  }

  async decideAppeal(actor: AuthenticatedUser, id: string, body: DecideAppealDto) {
    const outcome = body.outcome.trim();
    const reason = body.reason.trim();
    if (!outcome || !reason) throw new BadRequestException("Outcome and reason are required");
    return this.database.transaction(async (client) => {
      const found = await client.query<AppealRow>(`SELECT * FROM appeals WHERE id = $1 FOR UPDATE`, [id]);
      const appeal = found.rows[0];
      if (!appeal) throw new NotFoundException("No such appeal");
      if (appeal.status !== "submitted") throw new ConflictException("Appeal already decided");
      if (appeal.appellant_user_id === actor.userId) throw new ConflictException("Cannot decide your own appeal");
      const prior = await client.query(`SELECT 1 FROM case_actions WHERE case_id = $1 AND actor_user_id = $2`, [appeal.case_id, actor.userId]);
      if (prior.rowCount) throw new ConflictException("The original case actor cannot decide its appeal");
      const updated = await client.query<AppealRow>(
        `UPDATE appeals SET status = 'decided', reviewer_user_id = $2, outcome = $3, reason = $4,
          decided_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`, [id, actor.userId, outcome, reason],
      );
      await this.audit.record({ actorUserId: actor.userId, action: "appeal.decided", targetType: "appeal", targetId: id, reason }, client);
      return appealView(updated.rows[0]);
    });
  }
}
