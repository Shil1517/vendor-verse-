import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import {
  CreateVendorDocumentDto,
  ReviewStatus,
  SubmitVerificationDto,
  VerificationLevel,
} from "./dto/verification.dto";

interface DocumentRow {
  id: string;
  vendor_id: string;
  document_type: string;
  file_id: string;
  issued_by: string | null;
  expires_at: Date | null;
  submitted_at: Date;
}

interface VerificationRow {
  id: string;
  vendor_id: string;
  category_id: string | null;
  level: VerificationLevel;
  status: string;
  reviewer_user_id: string | null;
  reason: string | null;
  resubmission_of_id: string | null;
  submitted_at: Date;
  decided_at: Date | null;
  expires_at: Date | null;
  evidence: Array<{ documentId: string; documentType: string; fileId: string }>;
}

const DOCUMENT_COLUMNS =
  "id, vendor_id, document_type, file_id, issued_by, expires_at, submitted_at";
const VERIFICATION_COLUMNS = `
  verification.id, verification.vendor_id, verification.category_id,
  verification.level, verification.status, verification.reviewer_user_id,
  verification.reason, verification.resubmission_of_id,
  verification.submitted_at, verification.decided_at, verification.expires_at,
  COALESCE((
    SELECT json_agg(json_build_object(
      'documentId', document.id,
      'documentType', document.document_type,
      'fileId', document.file_id
    ) ORDER BY document.submitted_at, document.id)
    FROM verification_evidence AS evidence
    JOIN vendor_documents AS document ON document.id = evidence.document_id
    WHERE evidence.verification_id = verification.id
  ), '[]'::json) AS evidence`;

@Injectable()
export class VerificationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async addDocument(
    user: AuthenticatedUser,
    vendorId: string,
    request: CreateVendorDocumentDto,
  ) {
    const id = randomUUID();
    const document = await this.database.transaction(async (client) => {
      const vendor = await client.query(
        `SELECT 1 FROM vendors WHERE id = $1 AND owner_user_id = $2 FOR UPDATE`,
        [vendorId, user.userId],
      );
      if (vendor.rowCount !== 1) {
        throw new NotFoundException("No such vendor for this user");
      }

      const file = await client.query(
        `SELECT 1 FROM files
         WHERE id = $1 AND owner_user_id = $2 AND uploaded_at IS NOT NULL
           AND scan_status = 'clean' AND purpose = 'verification-evidence'`,
        [request.fileId, user.userId],
      );
      if (file.rowCount !== 1) {
        throw new BadRequestException(
          "Evidence must be an uploaded file owned by you and cleared by the scan",
        );
      }

      const result = await client.query<DocumentRow>(
        `INSERT INTO vendor_documents
           (id, vendor_id, document_type, file_id, issued_by, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${DOCUMENT_COLUMNS}`,
        [
          id,
          vendorId,
          request.documentType,
          request.fileId,
          request.issuedBy ?? null,
          request.expiresAt ?? null,
        ],
      );
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "vendor_document.submit",
          targetType: "vendor_document",
          targetId: id,
          metadata: { vendorId, documentType: request.documentType },
        },
        client,
      );
      return result.rows[0];
    });
    return toDocumentView(document);
  }

  async listDocuments(user: AuthenticatedUser, vendorId: string) {
    const result = await this.database.query<DocumentRow>(
      `SELECT document.id, document.vendor_id, document.document_type,
              document.file_id, document.issued_by, document.expires_at,
              document.submitted_at
       FROM vendor_documents AS document
       JOIN vendors AS vendor ON vendor.id = document.vendor_id
       WHERE document.vendor_id = $1 AND vendor.owner_user_id = $2
       ORDER BY document.submitted_at DESC, document.id`,
      [vendorId, user.userId],
    );
    if (result.rowCount === 0) {
      const owned = await this.database.query(
        `SELECT 1 FROM vendors WHERE id = $1 AND owner_user_id = $2`,
        [vendorId, user.userId],
      );
      if (owned.rowCount !== 1) {
        throw new NotFoundException("No such vendor for this user");
      }
    }
    return { documents: result.rows.map(toDocumentView) };
  }

  async submit(
    user: AuthenticatedUser,
    vendorId: string,
    request: SubmitVerificationDto,
  ) {
    const id = randomUUID();
    const row = await this.database.transaction(async (client) => {
      const vendor = await client.query(
        `SELECT 1 FROM vendors WHERE id = $1 AND owner_user_id = $2 FOR UPDATE`,
        [vendorId, user.userId],
      );
      if (vendor.rowCount !== 1) {
        throw new NotFoundException("No such vendor for this user");
      }

      if (request.categoryId) {
        const category = await client.query(
          `SELECT 1 FROM vendor_categories
           WHERE vendor_id = $1 AND category_id = $2`,
          [vendorId, request.categoryId],
        );
        if (category.rowCount !== 1) {
          throw new BadRequestException(
            "The category is not selected for this vendor",
          );
        }
      }

      const documentIds = request.documentIds ?? [];
      if (documentIds.length > 0) {
        const documents = await client.query(
          `SELECT count(*)::int AS count
           FROM vendor_documents AS document
           JOIN files AS file ON file.id = document.file_id
           WHERE document.vendor_id = $1
             AND document.id = ANY($2::uuid[])
             AND file.uploaded_at IS NOT NULL AND file.scan_status = 'clean'`,
          [vendorId, documentIds],
        );
        if (documents.rows[0]?.count !== documentIds.length) {
          throw new BadRequestException(
            "Every evidence document must belong to this vendor",
          );
        }
      }

      const latest = await client.query<{
        id: string;
        status: string;
      }>(
        `SELECT id, status FROM verifications
         WHERE vendor_id = $1 AND level = $2
           AND category_id IS NOT DISTINCT FROM $3::uuid
         ORDER BY submitted_at DESC, id DESC
         LIMIT 1 FOR UPDATE`,
        [vendorId, request.level, request.categoryId ?? null],
      );
      const previous = latest.rows[0];
      if (
        previous &&
        ["submitted", "in_review"].includes(previous.status)
      ) {
        throw new ConflictException(
          "A verification for this level is already being reviewed",
        );
      }

      const resubmissionOf =
        previous && ["info_requested", "rejected"].includes(previous.status)
          ? previous.id
          : null;
      const inserted = await client.query<VerificationRow>(
        `INSERT INTO verifications
           (id, vendor_id, category_id, level, status, resubmission_of_id)
         VALUES ($1, $2, $3, $4, 'submitted', $5)
         RETURNING id, vendor_id, category_id, level, status,
                   reviewer_user_id, reason, resubmission_of_id,
                   submitted_at, decided_at, expires_at, '[]'::json AS evidence`,
        [
          id,
          vendorId,
          request.categoryId ?? null,
          request.level,
          resubmissionOf,
        ],
      );
      for (const documentId of documentIds) {
        await client.query(
          `INSERT INTO verification_evidence (verification_id, document_id)
           VALUES ($1, $2)`,
          [id, documentId],
        );
      }
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "verification.submit",
          targetType: "verification",
          targetId: id,
          metadata: {
            vendorId,
            level: request.level,
            categoryId: request.categoryId ?? null,
            evidenceCount: documentIds.length,
          },
        },
        client,
      );
      return inserted.rows[0];
    });
    return toVerificationView(row);
  }

  async listForVendor(user: AuthenticatedUser, vendorId: string) {
    const result = await this.database.query<VerificationRow>(
      `SELECT ${VERIFICATION_COLUMNS}
       FROM verifications AS verification
       JOIN vendors AS vendor ON vendor.id = verification.vendor_id
       WHERE verification.vendor_id = $1 AND vendor.owner_user_id = $2
       ORDER BY verification.submitted_at DESC, verification.id DESC`,
      [vendorId, user.userId],
    );
    if (result.rowCount === 0) {
      const owned = await this.database.query(
        `SELECT 1 FROM vendors WHERE id = $1 AND owner_user_id = $2`,
        [vendorId, user.userId],
      );
      if (owned.rowCount !== 1) {
        throw new NotFoundException("No such vendor for this user");
      }
    }
    return { verifications: result.rows.map(toVerificationView) };
  }

  async listReviewQueue(options: {
    status?: string;
    limit: number;
    cursor?: string;
  }) {
    const cursor = decodeCursor(options.cursor);
    const result = await this.database.query<VerificationRow>(
      `SELECT ${VERIFICATION_COLUMNS}
       FROM verifications AS verification
       JOIN vendors AS vendor ON vendor.id = verification.vendor_id
       WHERE ($1::text IS NULL OR verification.status = $1)
         AND ($2::timestamptz IS NULL OR
              (verification.submitted_at, verification.id) > ($2, $3::uuid))
       ORDER BY verification.submitted_at, verification.id
       LIMIT $4`,
      [
        options.status ?? null,
        cursor?.submittedAt ?? null,
        cursor?.id ?? null,
        options.limit + 1,
      ],
    );
    const hasMore = result.rows.length > options.limit;
    const rows = hasMore ? result.rows.slice(0, options.limit) : result.rows;
    return {
      verifications: rows.map(toVerificationView),
      nextCursor:
        hasMore && rows.length > 0
          ? encodeCursor(rows[rows.length - 1])
          : null,
    };
  }

  async review(
    actor: AuthenticatedUser,
    verificationId: string,
    status: ReviewStatus,
    reason: string,
    expiresAt?: string,
  ) {
    if (status !== "approved" && expiresAt !== undefined) {
      throw new BadRequestException(
        "expiresAt may only be set for an approved verification",
      );
    }
    const updated = await this.database.transaction(async (client) => {
      const current = await client.query<{
        vendor_id: string;
        owner_user_id: string;
        status: string;
      }>(
        `SELECT verification.vendor_id, vendor.owner_user_id,
                verification.status
         FROM verifications AS verification
         JOIN vendors AS vendor ON vendor.id = verification.vendor_id
         WHERE verification.id = $1
         FOR UPDATE OF verification`,
        [verificationId],
      );
      const row = current.rows[0];
      if (!row) {
        throw new NotFoundException("No such verification");
      }
      if (row.owner_user_id === actor.userId) {
        throw new ForbiddenException(
          "A vendor owner cannot review their own verification",
        );
      }
      if (!["submitted", "in_review"].includes(row.status)) {
        throw new ConflictException(
          "Only submitted or in-review verifications can be reviewed",
        );
      }

      const result = await client.query<VerificationRow>(
        `UPDATE verifications AS verification
         SET status = $2, reviewer_user_id = $3, reason = $4,
             decided_at = CASE WHEN $2 = 'in_review' THEN NULL
                               ELSE CURRENT_TIMESTAMP END,
             expires_at = CASE WHEN $2 = 'approved' THEN $5::timestamptz
                               ELSE NULL END
         WHERE verification.id = $1
         RETURNING verification.id, verification.vendor_id,
                   verification.category_id, verification.level,
                   verification.status, verification.reviewer_user_id,
                   verification.reason, verification.resubmission_of_id,
                   verification.submitted_at, verification.decided_at,
                   verification.expires_at, '[]'::json AS evidence`,
        [verificationId, status, actor.userId, reason, expiresAt ?? null],
      );
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: `verification.${status}`,
          targetType: "verification",
          targetId: verificationId,
          reason,
          metadata: { vendorId: row.vendor_id, expiresAt: expiresAt ?? null },
        },
        client,
      );
      return result.rows[0];
    });
    return toVerificationView(updated);
  }
}

function toDocumentView(row: DocumentRow) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    documentType: row.document_type,
    fileId: row.file_id,
    issuedBy: row.issued_by,
    expiresAt: row.expires_at?.toISOString() ?? null,
    submittedAt: row.submitted_at.toISOString(),
  };
}

function toVerificationView(row: VerificationRow) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    categoryId: row.category_id,
    level: row.level,
    status: row.status,
    reviewerUserId: row.reviewer_user_id,
    reason: row.reason,
    resubmissionOfId: row.resubmission_of_id,
    submittedAt: row.submitted_at.toISOString(),
    decidedAt: row.decided_at?.toISOString() ?? null,
    expiresAt: row.expires_at?.toISOString() ?? null,
    evidence: row.evidence,
  };
}

function encodeCursor(row: VerificationRow): string {
  return Buffer.from(
    JSON.stringify([row.submitted_at.toISOString(), row.id]),
  ).toString("base64url");
}

function decodeCursor(
  cursor?: string,
): { submittedAt: string; id: string } | undefined {
  if (cursor === undefined) return undefined;
  let decoded: unknown;
  try {
    decoded = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new BadRequestException("Invalid verification queue cursor");
    }
    throw error;
  }
  if (
    !Array.isArray(decoded) ||
    typeof decoded[0] !== "string" ||
    typeof decoded[1] !== "string" ||
    !Number.isFinite(Date.parse(decoded[0])) ||
    !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(decoded[1])
  ) {
    throw new BadRequestException("Invalid verification queue cursor");
  }
  return { submittedAt: decoded[0], id: decoded[1] };
}
