import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { ASSIGNABLE_ROLES, AssignableRole } from "./dto/role-change.dto";

interface AssignmentRow {
  id: string;
  role_code: string;
  grant_reason: string | null;
  granted_at: Date;
  granted_by_user_id: string | null;
}

@Injectable()
export class RbacService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async listRoles() {
    const result = await this.database.query<{
      code: string;
      display_name: string;
      permissions: string[];
    }>(
      `SELECT role.code, role.display_name,
              COALESCE(array_agg(grant_row.permission_code
                                 ORDER BY grant_row.permission_code)
                       FILTER (WHERE grant_row.permission_code IS NOT NULL),
                       '{}') AS permissions
       FROM roles AS role
       LEFT JOIN role_permissions AS grant_row ON grant_row.role_code = role.code
       GROUP BY role.code, role.display_name
       ORDER BY role.code`,
    );
    return result.rows.map((row) => ({
      code: row.code,
      displayName: row.display_name,
      assignable: (ASSIGNABLE_ROLES as readonly string[]).includes(row.code),
      permissions: row.permissions,
    }));
  }

  async listUserRoles(userId: string) {
    await this.requireUser(this.database, userId);
    const result = await this.database.query<AssignmentRow>(
      `SELECT id, role_code, grant_reason, granted_at, granted_by_user_id
       FROM user_role_assignments
       WHERE user_id = $1 AND revoked_at IS NULL
       ORDER BY granted_at`,
      [userId],
    );
    return {
      userId,
      roles: result.rows.map((row) => ({
        id: row.id,
        roleCode: row.role_code,
        reason: row.grant_reason,
        grantedAt: row.granted_at,
        grantedByUserId: row.granted_by_user_id,
      })),
    };
  }

  async grant(
    actor: AuthenticatedUser,
    userId: string,
    roleCode: AssignableRole,
    reason: string,
  ) {
    this.refuseSelfChange(actor, userId);
    return this.database.transaction(async (client) => {
      await this.requireUser(client, userId);
      const existing = await client.query(
        `SELECT 1 FROM user_role_assignments
         WHERE user_id = $1 AND role_code = $2 AND revoked_at IS NULL`,
        [userId, roleCode],
      );
      if (existing.rowCount) {
        throw new ConflictException("The user already holds this role");
      }
      const id = randomUUID();
      const inserted = await client.query<{ granted_at: Date }>(
        `INSERT INTO user_role_assignments
           (id, user_id, role_code, granted_by_user_id, grant_reason)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING granted_at`,
        [id, userId, roleCode, actor.userId, reason],
      );
      await this.audit.record(
        {
          actorUserId: actor.userId,
          actorRole: "SUPER_ADMIN",
          action: "rbac.role_granted",
          targetType: "user",
          targetId: userId,
          reason,
          metadata: { roleCode, assignmentId: id },
        },
        client,
      );
      return {
        id,
        userId,
        roleCode,
        reason,
        grantedAt: inserted.rows[0].granted_at,
      };
    });
  }

  async revoke(
    actor: AuthenticatedUser,
    userId: string,
    roleCode: AssignableRole,
    reason: string,
  ) {
    this.refuseSelfChange(actor, userId);
    return this.database.transaction(async (client) => {
      await this.requireUser(client, userId);
      if (roleCode === "SUPER_ADMIN") {
        // Serialise concurrent revocations so the last Super Admin cannot be
        // removed by two requests that each still see another one.
        const holders = await client.query(
          `SELECT user_id FROM user_role_assignments
           WHERE role_code = 'SUPER_ADMIN' AND revoked_at IS NULL
           FOR UPDATE`,
        );
        if ((holders.rowCount ?? 0) <= 1) {
          throw new ConflictException("The last Super Admin cannot be revoked");
        }
      }
      const revoked = await client.query<{ id: string }>(
        `UPDATE user_role_assignments
         SET revoked_at = CURRENT_TIMESTAMP,
             revoked_by_user_id = $3,
             revocation_reason = $4
         WHERE user_id = $1 AND role_code = $2 AND revoked_at IS NULL
         RETURNING id`,
        [userId, roleCode, actor.userId, reason],
      );
      if (revoked.rowCount !== 1) {
        throw new NotFoundException("The user does not hold this role");
      }
      await this.audit.record(
        {
          actorUserId: actor.userId,
          actorRole: "SUPER_ADMIN",
          action: "rbac.role_revoked",
          targetType: "user",
          targetId: userId,
          reason,
          metadata: { roleCode, assignmentId: revoked.rows[0].id },
        },
        client,
      );
      return { userId, roleCode, revoked: true };
    });
  }

  /** Separation of duties: nobody changes their own roles. */
  private refuseSelfChange(actor: AuthenticatedUser, userId: string): void {
    if (actor.userId === userId) {
      throw new ForbiddenException("You cannot change your own roles");
    }
  }

  private async requireUser(
    runner: {
      query(
        text: string,
        values?: string[],
      ): Promise<{ rowCount: number | null }>;
    },
    userId: string,
  ): Promise<void> {
    const user = await runner.query(`SELECT 1 FROM users WHERE id = $1`, [
      userId,
    ]);
    if (user.rowCount !== 1) throw new NotFoundException("No such user");
  }
}
