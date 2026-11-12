import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import {
  AddVendorRoleDto,
  CreateRoleDefinitionDto,
  RoleDecisionDto,
  UpdateRoleDefinitionDto,
} from "./dto/vendor-role.dto";
import { VendorRolesService } from "./vendor-roles.service";

const user: AuthenticatedUser = { userId: "owner", sessionId: "s1" };
const reviewer: AuthenticatedUser = { userId: "reviewer", sessionId: "s2" };
const result = (rows: unknown[] = [], rowCount = rows.length) => ({
  rows,
  rowCount,
});
const roleRow = (over: Record<string, unknown> = {}) => ({
  vendor_id: "v1",
  role_code: "WHOLESALER",
  label: "Wholesaler",
  offer_type: "products",
  status: "pending",
  reason: null,
  decided_at: null,
  created_at: new Date("2026-11-12T10:00:00Z"),
  ...over,
});
const definitionRow = (over: Record<string, unknown> = {}) => ({
  code: "RETAILER",
  label: "Retailer",
  description: null,
  offer_type: "products",
  required_documents: [],
  is_active: true,
  ...over,
});

describe("VendorRolesService", () => {
  let query: jest.Mock;
  let clientQuery: jest.Mock;
  let record: jest.Mock;
  let service: VendorRolesService;

  beforeEach(() => {
    query = jest.fn();
    clientQuery = jest.fn();
    record = jest.fn().mockResolvedValue(undefined);
    const database = {
      query,
      transaction: (operation: (client: unknown) => unknown) =>
        operation({ query: clientQuery }),
    } as unknown as DatabaseService;
    service = new VendorRolesService(database, {
      record,
    } as unknown as AuditService);
  });

  describe("role catalogue", () => {
    it("hides retired roles unless asked", async () => {
      query.mockResolvedValue(result([definitionRow()]));
      await service.listDefinitions();
      expect(query.mock.calls[0][1]).toEqual([false]);
      await service.listDefinitions(true);
      expect(query.mock.calls[1][1]).toEqual([true]);
    });

    it("creates a role and audits it", async () => {
      clientQuery.mockResolvedValueOnce(result([definitionRow()]));
      const view = await service.createDefinition(reviewer, {
        code: "RETAILER",
        label: "Retailer",
        offerType: "products",
        requiredDocuments: ["GST certificate"],
      });
      expect(clientQuery.mock.calls[0][1]).toEqual([
        "RETAILER",
        "Retailer",
        null,
        "products",
        '["GST certificate"]',
      ]);
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "vendor_role_definition.create",
          targetId: "RETAILER",
        }),
        expect.anything(),
      );
      expect(view).toMatchObject({ code: "RETAILER", isActive: true });
    });

    it("409s on a duplicate code", async () => {
      clientQuery.mockResolvedValueOnce(result());
      await expect(
        service.createDefinition(reviewer, { code: "RETAILER", label: "R" }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(record).not.toHaveBeenCalled();
    });

    it("404s when editing an unknown role and retires with isActive false", async () => {
      clientQuery.mockResolvedValueOnce(result());
      await expect(
        service.updateDefinition(reviewer, "NOPE", { label: "x" }),
      ).rejects.toBeInstanceOf(NotFoundException);

      clientQuery
        .mockResolvedValueOnce(result([{}]))
        .mockResolvedValueOnce(result([definitionRow({ is_active: false })]));
      const view = await service.updateDefinition(reviewer, "RETAILER", {
        isActive: false,
      });
      expect(clientQuery.mock.calls[2][1]).toEqual([
        "RETAILER",
        null,
        null,
        null,
        null,
        false,
      ]);
      expect(view.isActive).toBe(false);
    });
  });

  describe("a vendor's own roles", () => {
    it("scopes the list to the owner", async () => {
      query.mockResolvedValueOnce(result());
      await expect(service.listForVendor(user, "other")).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(query.mock.calls[0][1]).toEqual(["other", "owner"]);
    });

    it("never marks a pending role public", async () => {
      query
        .mockResolvedValueOnce(result([{}]))
        .mockResolvedValueOnce(
          result([roleRow(), roleRow({ role_code: "SUPPLIER", status: "verified" })]),
        );
      const roles = await service.listForVendor(user, "v1");
      expect(roles.map((role) => role.isPublic)).toEqual([false, true]);
    });

    it("adds a role as pending and audits it", async () => {
      clientQuery
        .mockResolvedValueOnce(result([{}])) // owned
        .mockResolvedValueOnce(result([{}])) // active definition
        .mockResolvedValueOnce(result()) // not held yet
        .mockResolvedValue(result());
      query.mockResolvedValueOnce(result([roleRow()]));
      const roles = await service.addRole(user, "v1", "WHOLESALER");
      expect(
        clientQuery.mock.calls.some((call) =>
          String(call[0]).includes("INSERT INTO vendor_roles"),
        ),
      ).toBe(true);
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "vendor_role.add",
          metadata: { roleCode: "WHOLESALER", resubmission: false },
        }),
        expect.anything(),
      );
      expect(roles[0]).toMatchObject({ status: "pending", isPublic: false });
    });

    it("rejects an unknown or retired role", async () => {
      clientQuery
        .mockResolvedValueOnce(result([{}]))
        .mockResolvedValueOnce(result());
      await expect(
        service.addRole(user, "v1", "NOPE"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("409s when the role is already pending or verified", async () => {
      for (const status of ["pending", "verified"]) {
        clientQuery
          .mockResolvedValueOnce(result([{}]))
          .mockResolvedValueOnce(result([{}]))
          .mockResolvedValueOnce(result([{ status }]));
        await expect(
          service.addRole(user, "v1", "WHOLESALER"),
        ).rejects.toBeInstanceOf(ConflictException);
      }
    });

    it("resubmits a rejected role as pending and clears the decision", async () => {
      clientQuery
        .mockResolvedValueOnce(result([{}]))
        .mockResolvedValueOnce(result([{}]))
        .mockResolvedValueOnce(result([{ status: "rejected" }]))
        .mockResolvedValue(result());
      query.mockResolvedValueOnce(result([roleRow()]));
      await service.addRole(user, "v1", "WHOLESALER");
      const update = clientQuery.mock.calls.find((call) =>
        String(call[0]).includes("SET status = 'pending'"),
      );
      expect(update).toBeDefined();
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { roleCode: "WHOLESALER", resubmission: true },
        }),
        expect.anything(),
      );
    });

    it("keeps at least one role", async () => {
      clientQuery
        .mockResolvedValueOnce(result([{}]))
        .mockResolvedValueOnce(result([{ role_code: "WHOLESALER" }]));
      await expect(
        service.removeRole(user, "v1", "WHOLESALER"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("404s when removing a role the vendor does not hold", async () => {
      clientQuery
        .mockResolvedValueOnce(result([{}]))
        .mockResolvedValueOnce(
          result([{ role_code: "A" }, { role_code: "B" }]),
        );
      await expect(
        service.removeRole(user, "v1", "C"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("removes a role and repoints the primary role", async () => {
      clientQuery
        .mockResolvedValueOnce(result([{}]))
        .mockResolvedValueOnce(
          result([{ role_code: "SUPPLIER" }, { role_code: "WHOLESALER" }]),
        )
        .mockResolvedValue(result());
      query.mockResolvedValueOnce(result([roleRow()]));
      await service.removeRole(user, "v1", "SUPPLIER");
      expect(String(clientQuery.mock.calls[2][0])).toContain("DELETE FROM");
      expect(String(clientQuery.mock.calls[3][0])).toContain(
        "business_type",
      );
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({ action: "vendor_role.remove" }),
        expect.anything(),
      );
    });
  });

  describe("review", () => {
    const decideFrom = (status: string, owner = "owner") => {
      clientQuery
        .mockResolvedValueOnce(result([{ status, owner_user_id: owner }]))
        .mockResolvedValue(result());
      query.mockResolvedValue(result());
    };

    it("lists the pending queue by default", async () => {
      query.mockResolvedValueOnce(
        result([roleRow({ legal_name: "Sharma Pvt Ltd" })]),
      );
      const queue = await service.listReviewQueue({ limit: 50 });
      expect(query.mock.calls[0][1]).toEqual(["pending", 50]);
      expect(queue.roles[0]).toMatchObject({
        legalName: "Sharma Pvt Ltd",
        isPublic: false,
      });
    });

    it("verifies a pending role with a reason, and the role becomes public", async () => {
      clientQuery.mockImplementation(async (sql: string) =>
        String(sql).includes("FROM vendor_roles AS r") &&
        String(sql).includes("ORDER BY r.created_at")
          ? result([
              roleRow({
                status: "verified",
                reason: "Licence checked",
                decided_at: new Date("2026-11-12T11:00:00Z"),
              }),
            ])
          : result([{ status: "pending", owner_user_id: "owner" }]),
      );
      const view = await service.decide(
        reviewer,
        "v1",
        "WHOLESALER",
        "verified",
        "Licence checked",
      );
      expect(view).toMatchObject({ status: "verified", isPublic: true });
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "vendor_role.decide",
          metadata: {
            roleCode: "WHOLESALER",
            decision: "verified",
            from: "pending",
          },
        }),
        expect.anything(),
      );
    });

    it("requires a reason", async () => {
      await expect(
        service.decide(reviewer, "v1", "WHOLESALER", "verified", "   "),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(clientQuery).not.toHaveBeenCalled();
    });

    it("404s for a role the vendor does not hold", async () => {
      clientQuery.mockResolvedValueOnce(result());
      await expect(
        service.decide(reviewer, "v1", "NOPE", "verified", "ok"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("stops a reviewer deciding on their own vendor", async () => {
      decideFrom("pending", "reviewer");
      await expect(
        service.decide(reviewer, "v1", "WHOLESALER", "verified", "ok"),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(record).not.toHaveBeenCalled();
    });

    it.each([
      ["verified", "verified"],
      ["rejected", "verified"],
      ["pending", "revoked"],
      ["revoked", "verified"],
    ])("409s deciding %s -> %s", async (from, decision) => {
      decideFrom(from);
      await expect(
        service.decide(
          reviewer,
          "v1",
          "WHOLESALER",
          decision as "verified",
          "ok",
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(record).not.toHaveBeenCalled();
    });
  });

  describe("validation", () => {
    const errors = async (cls: new () => object, plain: object) =>
      (await validate(plainToInstance(cls, plain))).map((e) => e.property);

    it("checks role code shape and required fields on create", async () => {
      expect(await errors(CreateRoleDefinitionDto, {})).toEqual(
        expect.arrayContaining(["code", "label"]),
      );
      expect(
        await errors(CreateRoleDefinitionDto, { code: "retailer", label: "R" }),
      ).toEqual(["code"]);
      expect(
        await errors(CreateRoleDefinitionDto, {
          code: "RETAILER",
          label: "Retailer",
          offerType: "both",
        }),
      ).toEqual(["offerType"]);
      expect(
        await errors(CreateRoleDefinitionDto, {
          code: "RETAILER",
          label: "Retailer",
          offerType: "products",
          requiredDocuments: ["GST certificate"],
        }),
      ).toEqual([]);
    });

    it("rejects nulls on update but accepts an empty patch", async () => {
      expect(await errors(UpdateRoleDefinitionDto, { label: null })).toEqual([
        "label",
      ]);
      expect(await errors(UpdateRoleDefinitionDto, {})).toEqual([]);
    });

    it("validates add and decision bodies", async () => {
      expect(await errors(AddVendorRoleDto, { roleCode: "x" })).toEqual([
        "roleCode",
      ]);
      expect(
        await errors(RoleDecisionDto, { decision: "approved", reason: "" }),
      ).toEqual(expect.arrayContaining(["decision", "reason"]));
      expect(
        await errors(RoleDecisionDto, { decision: "revoked", reason: "x" }),
      ).toEqual([]);
    });
  });
});
