import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PoolClient } from "pg";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AuditService } from "../platform/audit.service";
import { CreateReviewDto, ReviewTransactionType } from "./dto/review.dto";

const transactions: Record<ReviewTransactionType, string> = {
  booking: `SELECT b.customer_user_id AS buyer_id, b.vendor_id, b.state, v.owner_user_id AS vendor_owner_id
    FROM bookings b JOIN vendors v ON v.id = b.vendor_id WHERE b.id = $1`,
  work_order: `SELECT w.customer_user_id AS buyer_id, w.vendor_id, w.state, v.owner_user_id AS vendor_owner_id
    FROM work_orders w JOIN vendors v ON v.id = w.vendor_id WHERE w.id = $1`,
  purchase_order: `SELECT p.buyer_user_id AS buyer_id, p.supplier_vendor_id AS vendor_id, p.state, v.owner_user_id AS vendor_owner_id
    FROM purchase_orders p JOIN vendors v ON v.id = p.supplier_vendor_id WHERE p.id = $1`,
  contract_milestone: `SELECT c.customer_user_id AS buyer_id, c.vendor_id, m.state, v.owner_user_id AS vendor_owner_id
    FROM milestones m JOIN contracts c ON c.id = m.contract_id JOIN vendors v ON v.id = c.vendor_id WHERE m.id = $1`,
};
const reviewableStates: Record<ReviewTransactionType, string[]> = {
  booking: ["closed"], work_order: ["closed"], purchase_order: ["completed"], contract_milestone: ["closed"],
};

interface TransactionRow { buyer_id: string; vendor_id: string; state: string; vendor_owner_id: string }
interface ReviewRow {
  id: string; vendor_id: string; transaction_type: string; transaction_id: string;
  overall_rating: number; comment: string | null; vendor_response: string | null;
  moderation_state: string; created_at: Date; vendor_responded_at: Date | null;
  dimensions: Array<{ dimension: string; rating: number }> | null;
}
const SELECT = `SELECT r.id, r.vendor_id, r.transaction_type, r.transaction_id, r.overall_rating,
  r.comment, r.vendor_response, r.vendor_responded_at, r.moderation_state, r.created_at,
  (SELECT COALESCE(jsonb_agg(jsonb_build_object('dimension', d.dimension, 'rating', d.rating)
    ORDER BY d.dimension), '[]'::jsonb) FROM review_ratings d WHERE d.review_id = r.id) AS dimensions
  FROM reviews r`;
const project = (row: ReviewRow) => ({
  id: row.id, vendorId: row.vendor_id, transactionType: row.transaction_type,
  transactionId: row.transaction_id, overallRating: row.overall_rating,
  comment: row.comment, dimensions: row.dimensions ?? [], vendorResponse: row.vendor_response,
  vendorRespondedAt: row.vendor_responded_at, createdAt: row.created_at,
});

@Injectable()
export class ReviewsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(user: AuthenticatedUser, body: CreateReviewDto) {
    if (body.comment !== undefined && !body.comment.trim()) throw new BadRequestException("Comment cannot be blank");
    const dimensions = (body.dimensions ?? []).map((item) => ({ dimension: item.dimension.trim(), rating: item.rating }));
    if (dimensions.some((item) => !item.dimension) || new Set(dimensions.map((item) => item.dimension.toLowerCase())).size !== dimensions.length) {
      throw new BadRequestException("Rating dimensions must be nonempty and unique");
    }
    try {
      const id = await this.database.transaction(async (client) => {
        const transaction = await client.query<TransactionRow>(transactions[body.transactionType], [body.transactionId]);
        const row = transaction.rows[0];
        if (!row || row.buyer_id !== user.userId || row.vendor_owner_id === user.userId) {
          throw new NotFoundException("No eligible transaction for this user");
        }
        if (!reviewableStates[body.transactionType].includes(row.state)) throw new ConflictException("Transaction is not completed");
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO reviews (author_user_id, vendor_id, transaction_type, transaction_id, overall_rating, comment)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [user.userId, row.vendor_id, body.transactionType, body.transactionId, body.overallRating, body.comment?.trim() ?? null],
        );
        const reviewId = inserted.rows[0].id;
        for (const dimension of dimensions) {
          await client.query(`INSERT INTO review_ratings (review_id, dimension, rating) VALUES ($1, $2, $3)`,
            [reviewId, dimension.dimension, dimension.rating]);
        }
        await this.audit.record({ actorUserId: user.userId, action: "review.created", targetType: "review", targetId: reviewId }, client);
        await this.notifications.notify({ recipientUserId: row.vendor_owner_id, eventType: "review.created", category: "reviews",
          dedupeKey: `review:${reviewId}`, linkedResource: { type: "review", id: reviewId } }, client);
        return reviewId;
      });
      return this.getForAuthor(user.userId, id);
    } catch (error) {
      if ((error as { code?: string })?.code === "23505") throw new ConflictException("This transaction has already been reviewed");
      throw error;
    }
  }

  private async getForAuthor(userId: string, id: string) {
    const result = await this.database.query<ReviewRow>(`${SELECT} WHERE r.id = $1 AND r.author_user_id = $2`, [id, userId]);
    if (!result.rows[0]) throw new NotFoundException("No such review");
    return project(result.rows[0]);
  }

  async mine(user: AuthenticatedUser) {
    const result = await this.database.query<ReviewRow>(`${SELECT} WHERE r.author_user_id = $1 ORDER BY r.created_at DESC, r.id DESC LIMIT 100`, [user.userId]);
    return { items: result.rows.map(project) };
  }

  async publicList(vendorId: string, limitInput?: string) {
    const limit = limitInput === undefined ? 25 : Number(limitInput);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new BadRequestException("limit must be 1 to 100");
    const publicVendor = await this.database.query(
      `SELECT 1 FROM vendors v WHERE v.id = $1 AND EXISTS
       (SELECT 1 FROM vendor_roles vr WHERE vr.vendor_id = v.id AND vr.status = 'verified')`, [vendorId],
    );
    if (!publicVendor.rowCount) throw new NotFoundException("No such public vendor");
    const [summary, reviews] = await Promise.all([
      this.database.query<{ rating_average: string | null; rating_count: string }>(
        `SELECT round(avg(overall_rating), 2)::text AS rating_average, count(*)::text AS rating_count
         FROM reviews WHERE vendor_id = $1 AND moderation_state = 'published'`, [vendorId]),
      this.database.query<ReviewRow>(`${SELECT} WHERE r.vendor_id = $1 AND r.moderation_state = 'published'
        ORDER BY r.created_at DESC, r.id DESC LIMIT $2`, [vendorId, limit]),
    ]);
    return { vendorId, ratingAverage: summary.rows[0].rating_average, ratingCount: Number(summary.rows[0].rating_count),
      items: reviews.rows.map(project) };
  }

  async respond(user: AuthenticatedUser, id: string, response: string) {
    const text = response.trim();
    if (!text) throw new BadRequestException("Response cannot be blank");
    return this.database.transaction(async (client: PoolClient) => {
      const found = await client.query<{ vendor_response: string | null }>(
        `SELECT r.vendor_response FROM reviews r JOIN vendors v ON v.id = r.vendor_id
         WHERE r.id = $1 AND v.owner_user_id = $2 FOR UPDATE OF r`, [id, user.userId],
      );
      if (!found.rows[0]) throw new NotFoundException("No such review for this vendor");
      if (found.rows[0].vendor_response !== null) throw new ConflictException("Review already has a vendor response");
      await client.query(`UPDATE reviews SET vendor_response = $2, vendor_responded_at = CURRENT_TIMESTAMP WHERE id = $1`, [id, text]);
      await this.audit.record({ actorUserId: user.userId, action: "review.responded", targetType: "review", targetId: id }, client);
      return { id, response: text };
    });
  }
}
