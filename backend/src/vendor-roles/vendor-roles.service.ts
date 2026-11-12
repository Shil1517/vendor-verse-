import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { QueryResult, QueryResultRow } from "pg";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import {
  CreateRoleDefinitionDto,
  OfferType,
  RoleDecision,
  RoleStatus,
  UpdateRoleDefinitionDto,
} from "./dto/vendor-role.dto";

export interface RoleDefinitionView {
  code: string;
  label: string;
  description: string | null;
  offerType: OfferType | null;
  requiredDocuments: string[];
  isActive: boolean;
}

export interface VendorRoleView {
  vendorId: string;
  roleCode: string;
  label: string;
  offerType: OfferType | null;
  status: RoleStatus;
  /** Only `verified` roles are shown publicly (D-020, D-021). */
  isPublic: boolean;
  reason: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface RoleReviewItem extends VendorRoleView {
  legalName: string | null;
}

interface DefinitionRow {
  code: string;
  label: string;
  description: string | null;
  offer_type: OfferType | null;
  required_documents: string[];
  is_active: boolean;
}

interface VendorRoleRow {
  vendor_id: string;
  role_code: string;
  label: string;
  offer_type: OfferType | null;
  status: RoleStatus;
  reason: string | null;
  decided_at: Date | null;
  created_at: Date;
  legal_name?: string | null;
}

const DEFINITION_COLUMNS = `code, label, description, offer_type,
        required_documents, is_active`;

const ROLE_SELECT = `SELECT r.vendor_id, r.role_code, d.label, d.offer_type,
        r.status, r.reason, r.decided_at, r.created_at`;

/** Review decisions that are allowed from each current status. */
const ALLOWED_FROM: Record<RoleDecision, RoleStatus[]> = {
  verified: ["pending"],
  rejected: ["pending"],
  revoked: ["verified"],
};

/**
 * Vendor roles (D-023, D-024). Role definitions are data an administrator
 * manages, not a fixed list. A vendor holds one or more roles; each is reviewed
 * on its own (D-020) and shown publicly only once verified (D-021). A vendor
 * submits only the documents its own roles require (D-019), which clients read
 * from the definitions.
 */
@Injectable()
export class VendorRolesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  // ---- role catalogue -----------------------------------------------------

  async listDefinitions(includeRetired = false): Promise<RoleDefinitionView[]> {
    const result = await this.database.query<DefinitionRow>(
      `SELECT ${DEFINITION_COLUMNS}
       FROM vendor_role_definitions
       WHERE is_active OR $1
       ORDER BY label, code`,
      [includeRetired],
    );
    return result.rows.map(toDefinition);
  }

  async createDefinition(
    actor: AuthenticatedUser,
    request: CreateRoleDefinitionDto,
  ): Promise<RoleDefinitionView> {
    return this.database.transaction(async (client) => {
      const inserted = await client.query<DefinitionRow>(
        `INSERT INTO vendor_role_definitions
           (code, label, description, offer_type, required_documents)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         ON CONFLICT (code) DO NOTHING
         RETURNING ${DEFINITION_COLUMNS}`,
        [
          request.code,
          request.label,
          request.description ?? null,
          request.offerType ?? null,
          JSON.stringify(request.requiredDocuments ?? []),
        ],
      );
      if (inserted.rowCount !== 1) {
        throw new ConflictException("That role code already exists");
      }
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: "vendor_role_definition.create",
          targetType: "vendor_role_definition",
          targetId: request.code,
          metadata: { label: request.label },
        },
        client,
      );
      return toDefinition(inserted.rows[0]);
    });
  }

  async updateDefinition(
    actor: AuthenticatedUser,
    code: string,
    request: UpdateRoleDefinitionDto,
  ): Promise<RoleDefinitionView> {
    return this.database.transaction(async (client) => {
      const current = await client.query(
        `SELECT 1 FROM vendor_role_definitions WHERE code = $1 FOR UPDATE`,
        [code],
      );
      if (current.rowCount !== 1) {
        throw new NotFoundException("No such vendor role");
      }
      const updated = await client.query<DefinitionRow>(
        `UPDATE vendor_role_definitions
         SET label = COALESCE($2, label),
             description = COALESCE($3, description),
             offer_type = COALESCE($4, offer_type),
             required_documents =
               COALESCE($5::jsonb, required_documents),
             is_active = COALESCE($6, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE code = $1
         RETURNING ${DEFINITION_COLUMNS}`,
        [
          code,
          request.label ?? null,
          request.description ?? null,
          request.offerType ?? null,
          request.requiredDocuments === undefined
            ? null
            : JSON.stringify(request.requiredDocuments),
          request.isActive ?? null,
        ],
      );
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: "vendor_role_definition.update",
          targetType: "vendor_role_definition",
          targetId: code,
          metadata: {
            fields: Object.keys(request).filter(
              (key) =>
                request[key as keyof UpdateRoleDefinitionDto] !== undefined,
            ),
          },
        },
        client,
      );
      return toDefinition(updated.rows[0]);
    });
  }

  // ---- a vendor's own roles ----------------------------------------------

  async listForVendor(
    user: AuthenticatedUser,
    vendorId: string,
  ): Promise<VendorRoleView[]> {
    await this.assertOwned(this.database, user, vendorId);
    return this.readVendorRoles(this.database, vendorId);
  }

  /**
   * Adds a role as pending. A rejected or revoked role is resubmitted as
   * pending again; a pending or verified one is already held.
   */
  async addRole(
    user: AuthenticatedUser,
    vendorId: string,
    roleCode: string,
  ): Promise<VendorRoleView[]> {
    await this.database.transaction(async (client) => {
      await this.assertOwned(client, user, vendorId, true);
      const definition = await client.query(
        `SELECT 1 FROM vendor_role_definitions
         WHERE code = $1 AND is_active`,
        [roleCode],
      );
      if (definition.rowCount !== 1) {
        throw new BadRequestException("roleCode is unknown or retired");
      }
      const existing = await client.query<{ status: RoleStatus }>(
        `SELECT status FROM vendor_roles
         WHERE vendor_id = $1 AND role_code = $2 FOR UPDATE`,
        [vendorId, roleCode],
      );
      const status = existing.rows[0]?.status;
      if (status === "pending" || status === "verified") {
        throw new ConflictException("The vendor already holds this role");
      }
      if (status === undefined) {
        await client.query(
          `INSERT INTO vendor_roles (vendor_id, role_code) VALUES ($1, $2)`,
          [vendorId, roleCode],
        );
      } else {
        await client.query(
          `UPDATE vendor_roles
           SET status = 'pending', reviewer_user_id = NULL, reason = NULL,
               decided_at = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE vendor_id = $1 AND role_code = $2`,
          [vendorId, roleCode],
        );
      }
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "vendor_role.add",
          targetType: "vendor",
          targetId: vendorId,
          metadata: { roleCode, resubmission: status !== undefined },
        },
        client,
      );
    });
    return this.readVendorRoles(this.database, vendorId);
  }

  /** A vendor always keeps at least one role. */
  async removeRole(
    user: AuthenticatedUser,
    vendorId: string,
    roleCode: string,
  ): Promise<VendorRoleView[]> {
    await this.database.transaction(async (client) => {
      await this.assertOwned(client, user, vendorId, true);
      const roles = await client.query<{ role_code: string }>(
        `SELECT role_code FROM vendor_roles WHERE vendor_id = $1
         FOR UPDATE`,
        [vendorId],
      );
      if (!roles.rows.some((row) => row.role_code === roleCode)) {
        throw new NotFoundException("The vendor does not hold this role");
      }
      if (roles.rowCount === 1) {
        throw new BadRequestException("A vendor must keep at least one role");
      }
      await client.query(
        `DELETE FROM vendor_roles WHERE vendor_id = $1 AND role_code = $2`,
        [vendorId, roleCode],
      );
      // keep the primary role (vendors.business_type) pointing at a held role
      await client.query(
        `UPDATE vendors
         SET business_type = (
               SELECT role_code FROM vendor_roles WHERE vendor_id = $1
               ORDER BY created_at, role_code LIMIT 1),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND business_type = $2`,
        [vendorId, roleCode],
      );
      await this.audit.record(
        {
          actorUserId: user.userId,
          action: "vendor_role.remove",
          targetType: "vendor",
          targetId: vendorId,
          metadata: { roleCode },
        },
        client,
      );
    });
    return this.readVendorRoles(this.database, vendorId);
  }

  // ---- reviewers ----------------------------------------------------------

  async listReviewQueue(options: {
    status?: RoleStatus;
    limit: number;
  }): Promise<{ roles: RoleReviewItem[] }> {
    const result = await this.database.query<VendorRoleRow>(
      `${ROLE_SELECT}, v.legal_name
       FROM vendor_roles AS r
       JOIN vendor_role_definitions AS d ON d.code = r.role_code
       JOIN vendors AS v ON v.id = r.vendor_id
       WHERE r.status = $1
       ORDER BY r.created_at, r.vendor_id, r.role_code
       LIMIT $2`,
      [options.status ?? "pending", options.limit],
    );
    return {
      roles: result.rows.map((row) => ({
        ...toRoleView(row),
        legalName: row.legal_name ?? null,
      })),
    };
  }

  /**
   * Records a reviewer's decision on one role of one vendor (D-020). The reason
   * is required and audited. A reviewer cannot decide on their own vendor.
   */
  async decide(
    actor: AuthenticatedUser,
    vendorId: string,
    roleCode: string,
    decision: RoleDecision,
    reason: string,
  ): Promise<VendorRoleView> {
    if (reason.trim().length === 0) {
      throw new BadRequestException("A reason is required");
    }
    return this.database.transaction(async (client) => {
      const current = await client.query<{
        status: RoleStatus;
        owner_user_id: string;
      }>(
        `SELECT r.status, v.owner_user_id
         FROM vendor_roles AS r
         JOIN vendors AS v ON v.id = r.vendor_id
         WHERE r.vendor_id = $1 AND r.role_code = $2
         FOR UPDATE OF r`,
        [vendorId, roleCode],
      );
      const row = current.rows[0];
      if (!row) {
        throw new NotFoundException("The vendor does not hold this role");
      }
      if (row.owner_user_id === actor.userId) {
        throw new ForbiddenException(
          "A reviewer cannot decide on their own vendor's role",
        );
      }
      if (!ALLOWED_FROM[decision].includes(row.status)) {
        throw new ConflictException(
          `A ${row.status} role cannot be set to ${decision}`,
        );
      }
      await client.query(
        `UPDATE vendor_roles
         SET status = $3, reviewer_user_id = $4, reason = $5,
             decided_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE vendor_id = $1 AND role_code = $2`,
        [vendorId, roleCode, decision, actor.userId, reason.trim()],
      );
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: "vendor_role.decide",
          targetType: "vendor",
          targetId: vendorId,
          metadata: { roleCode, decision, from: row.status },
        },
        client,
      );
      const roles = await this.readVendorRoles(client, vendorId);
      return roles.find((role) => role.roleCode === roleCode)!;
    });
  }

  // ---- helpers ------------------------------------------------------------

  private async assertOwned(
    db: Queryable,
    user: AuthenticatedUser,
    vendorId: string,
    lock = false,
  ): Promise<void> {
    const owned = await db.query(
      `SELECT 1 FROM vendors WHERE id = $1 AND owner_user_id = $2${
        lock ? " FOR UPDATE" : ""
      }`,
      [vendorId, user.userId],
    );
    if (owned.rowCount !== 1) {
      throw new NotFoundException("No such vendor for this user");
    }
  }

  private async readVendorRoles(
    db: Queryable,
    vendorId: string,
  ): Promise<VendorRoleView[]> {
    const result = await db.query<VendorRoleRow>(
      `${ROLE_SELECT}
       FROM vendor_roles AS r
       JOIN vendor_role_definitions AS d ON d.code = r.role_code
       WHERE r.vendor_id = $1
       ORDER BY r.created_at, r.role_code`,
      [vendorId],
    );
    return result.rows.map(toRoleView);
  }
}

/** Satisfied by both DatabaseService and a transaction client. */
interface Queryable {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
}

function toDefinition(row: DefinitionRow): RoleDefinitionView {
  return {
    code: row.code,
    label: row.label,
    description: row.description,
    offerType: row.offer_type,
    requiredDocuments: row.required_documents,
    isActive: row.is_active,
  };
}

function toRoleView(row: VendorRoleRow): VendorRoleView {
  return {
    vendorId: row.vendor_id,
    roleCode: row.role_code,
    label: row.label,
    offerType: row.offer_type,
    status: row.status,
    isPublic: row.status === "verified",
    reason: row.reason,
    decidedAt: row.decided_at ? row.decided_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}
