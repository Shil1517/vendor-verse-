import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { CreateCategorySuggestionDto, DecideCategorySuggestionDto } from "./dto/category-suggestion.dto";

interface SuggestionRow {
  id: string;
  submitted_by_user_id: string;
  vendor_id: string | null;
  industry_id: string | null;
  proposed_path: string[];
  justification: string | null;
  nearest_category_id: string | null;
  status: string;
  created_category_id: string | null;
  reviewer_user_id: string | null;
  decision_reason: string | null;
  created_at: Date;
  reviewed_at: Date | null;
}

const project = (row: SuggestionRow) => ({
  id: row.id,
  submittedByUserId: row.submitted_by_user_id,
  vendorId: row.vendor_id,
  industryId: row.industry_id,
  proposedPath: row.proposed_path,
  justification: row.justification,
  nearestCategoryId: row.nearest_category_id,
  status: row.status,
  createdCategoryId: row.created_category_id,
  reviewerUserId: row.reviewer_user_id,
  decisionReason: row.decision_reason,
  createdAt: row.created_at,
  reviewedAt: row.reviewed_at,
});

@Injectable()
export class CategorySuggestionsService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  async create(user: AuthenticatedUser, request: CreateCategorySuggestionDto) {
    const path = request.proposedPath.map((part) => part.trim());
    if (path.some((part) => !part || part.length > 100)) throw new BadRequestException("Each path part must contain 1 to 100 characters");
    if (request.justification !== undefined && !request.justification.trim()) throw new BadRequestException("Justification cannot be blank");
    return this.database.transaction(async (client) => {
      const valid = await client.query(
        `SELECT 1 FROM vendors AS v
         JOIN categories AS c ON c.id = $3 AND c.industry_id = $2 AND c.lifecycle = 'ACTIVE'
         WHERE v.id = $1 AND v.owner_user_id = $4`,
        [request.vendorId, request.industryId, request.nearestCategoryId, user.userId],
      );
      if (!valid.rowCount) throw new NotFoundException("Vendor or approved category not found");
      const result = await client.query<SuggestionRow>(
        `INSERT INTO category_suggestions
           (submitted_by_user_id, vendor_id, industry_id, proposed_path, nearest_category_id, justification)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6) RETURNING *`,
        [user.userId, request.vendorId, request.industryId, JSON.stringify(path), request.nearestCategoryId, request.justification?.trim() ?? null],
      );
      await this.audit.record({ actorUserId: user.userId, action: "category_suggestion.submitted", targetType: "category_suggestion", targetId: result.rows[0].id }, client);
      return project(result.rows[0]);
    });
  }

  async mine(user: AuthenticatedUser) {
    const result = await this.database.query<SuggestionRow>(
      `SELECT * FROM category_suggestions WHERE submitted_by_user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 100`,
      [user.userId],
    );
    return { items: result.rows.map(project) };
  }

  async queue() {
    const result = await this.database.query<SuggestionRow>(
      `SELECT * FROM category_suggestions WHERE status = 'submitted' ORDER BY created_at, id LIMIT 100`,
    );
    return { items: result.rows.map(project) };
  }

  async decide(user: AuthenticatedUser, id: string, request: DecideCategorySuggestionDto) {
    const reason = request.reason.trim();
    if (!reason) throw new BadRequestException("Reason is required");
    if (request.decision === "rejected" && request.createdCategoryId) throw new BadRequestException("Rejected suggestions cannot create a category");
    return this.database.transaction(async (client) => {
      const found = await client.query<SuggestionRow>(
        `SELECT * FROM category_suggestions WHERE id = $1 FOR UPDATE`, [id],
      );
      const row = found.rows[0];
      if (!row) throw new NotFoundException("No such suggestion");
      if (row.status !== "submitted") throw new ConflictException("Suggestion already decided");
      if (row.submitted_by_user_id === user.userId) throw new ConflictException("Cannot review your own suggestion");
      if (request.createdCategoryId) {
        const category = await client.query(
          `SELECT 1 FROM categories WHERE id = $1 AND industry_id = $2 AND lifecycle IN ('DRAFT', 'ACTIVE')`,
          [request.createdCategoryId, row.industry_id],
        );
        if (!category.rowCount) throw new NotFoundException("No matching category in this industry");
      }
      const updated = await client.query<SuggestionRow>(
        `UPDATE category_suggestions
         SET status = $2, reviewer_user_id = $3, decision_reason = $4,
             created_category_id = $5, reviewed_at = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING *`,
        [id, request.decision, user.userId, reason, request.createdCategoryId ?? null],
      );
      await this.audit.record({ actorUserId: user.userId, action: `category_suggestion.${request.decision}`, targetType: "category_suggestion", targetId: id, reason }, client);
      return project(updated.rows[0]);
    });
  }
}
