import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { RbacService } from "./rbac.service";

const admin: AuthenticatedUser = { userId: "admin-1", sessionId: "s1" };
const result = (rows: unknown[] = [], rowCount = rows.length) => ({
  rows,
  rowCount,
});

describe("RbacService", () => {
  let query: jest.Mock;
  let clientQuery: jest.Mock;
  let record: jest.Mock;
  let service: RbacService;

  beforeEach(() => {
    query = jest.fn();
    clientQuery = jest.fn();
    record = jest.fn().mockResolvedValue(undefined);
    const database = {
      query,
      transaction: (operation: (client: unknown) => unknown) =>
        operation({ query: clientQuery }),
    } as unknown as DatabaseService;
    service = new RbacService(database, {
      record,
    } as unknown as AuditService);
  });

  describe("grant", () => {
    it("refuses to change the caller's own roles", async () => {
      await expect(
        service.grant(admin, "admin-1", "SUPER_ADMIN", "self"),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(clientQuery).not.toHaveBeenCalled();
    });

    it("404s for an unknown user", async () => {
      clientQuery.mockResolvedValueOnce(result());
      await expect(
        service.grant(admin, "u2", "SALES_AGENT", "hire"),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(record).not.toHaveBeenCalled();
    });

    it("409s when the role is already held", async () => {
      clientQuery
        .mockResolvedValueOnce(result([{}]))
        .mockResolvedValueOnce(result([{}]));
      await expect(
        service.grant(admin, "u2", "SALES_AGENT", "hire"),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("inserts the assignment and audits it in the same transaction", async () => {
      const grantedAt = new Date("2026-11-05T10:00:00Z");
      clientQuery
        .mockResolvedValueOnce(result([{}]))
        .mockResolvedValueOnce(result())
        .mockResolvedValueOnce(result([{ granted_at: grantedAt }]));
      const granted = await service.grant(
        admin,
        "u2",
        "SALES_AGENT",
        "Joined the sales team",
      );
      expect(granted).toMatchObject({
        userId: "u2",
        roleCode: "SALES_AGENT",
        reason: "Joined the sales team",
        grantedAt,
      });
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: "admin-1",
          action: "rbac.role_granted",
          targetId: "u2",
          reason: "Joined the sales team",
        }),
        expect.anything(),
      );
    });
  });

  describe("revoke", () => {
    it("refuses to change the caller's own roles", async () => {
      await expect(
        service.revoke(admin, "admin-1", "SUPER_ADMIN", "self"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("refuses to revoke the last Super Admin", async () => {
      clientQuery
        .mockResolvedValueOnce(result([{}]))
        .mockResolvedValueOnce(result([{ user_id: "u2" }]));
      await expect(
        service.revoke(admin, "u2", "SUPER_ADMIN", "left"),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(record).not.toHaveBeenCalled();
    });

    it("404s when the role is not held", async () => {
      clientQuery
        .mockResolvedValueOnce(result([{}]))
        .mockResolvedValueOnce(result());
      await expect(
        service.revoke(admin, "u2", "SALES_AGENT", "moved"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("revokes with the reason and audits it", async () => {
      clientQuery
        .mockResolvedValueOnce(result([{}]))
        .mockResolvedValueOnce(result([{ id: "a1" }]));
      await expect(
        service.revoke(admin, "u2", "SALES_AGENT", "Left the team"),
      ).resolves.toEqual({
        userId: "u2",
        roleCode: "SALES_AGENT",
        revoked: true,
      });
      expect(clientQuery.mock.calls[1][1]).toEqual([
        "u2",
        "SALES_AGENT",
        "admin-1",
        "Left the team",
      ]);
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "rbac.role_revoked",
          reason: "Left the team",
        }),
        expect.anything(),
      );
    });
  });

  describe("listRoles", () => {
    it("marks only SALES_AGENT and SUPER_ADMIN as assignable", async () => {
      query.mockResolvedValueOnce(
        result([
          { code: "CUSTOMER", display_name: "Customer", permissions: [] },
          {
            code: "SUPER_ADMIN",
            display_name: "Super Admin",
            permissions: ["rbac.read"],
          },
        ]),
      );
      const roles = await service.listRoles();
      expect(roles.map((role) => role.assignable)).toEqual([false, true]);
    });
  });
});
