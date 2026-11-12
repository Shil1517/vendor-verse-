import { BadRequestException, NotFoundException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { CreateVendorDto, UpdateVendorDto } from "./dto/vendor.dto";
import { VendorsService } from "./vendors.service";

const user: AuthenticatedUser = { userId: "u1", sessionId: "s1" };
const result = (rows: unknown[] = [], rowCount = rows.length) => ({
  rows,
  rowCount,
});
const vendorRow = (over: Record<string, unknown> = {}) => ({
  id: "v1",
  business_type: "SUPPLIER",
  legal_name: "Sharma Electricals Pvt Ltd",
  registration_country: "IN",
  trading_name: null,
  description: null,
  languages: null,
  year_established: null,
  created_at: new Date("2026-11-05T10:00:00Z"),
  ...over,
});

describe("VendorsService", () => {
  let query: jest.Mock;
  let clientQuery: jest.Mock;
  let record: jest.Mock;
  let service: VendorsService;

  beforeEach(() => {
    query = jest.fn();
    clientQuery = jest.fn();
    record = jest.fn().mockResolvedValue(undefined);
    const database = {
      query,
      transaction: (operation: (client: unknown) => unknown) =>
        operation({ query: clientQuery }),
    } as unknown as DatabaseService;
    service = new VendorsService(database, {
      record,
    } as unknown as AuditService);
  });

  describe("create", () => {
    const request: CreateVendorDto = {
      registrationCountry: "IN",
      businessType: "SUPPLIER",
      legalName: "Sharma Electricals Pvt Ltd",
    };

    it("rejects an unknown country before writing anything", async () => {
      clientQuery.mockResolvedValueOnce(result());
      await expect(service.create(user, request)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(clientQuery).toHaveBeenCalledTimes(1);
      expect(record).not.toHaveBeenCalled();
    });

    it("rejects an unknown or retired role before writing the vendor", async () => {
      clientQuery
        .mockResolvedValueOnce(result([{ "?column?": 1 }]))
        .mockResolvedValueOnce(result());
      await expect(service.create(user, request)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(clientQuery).toHaveBeenCalledTimes(2);
      expect(record).not.toHaveBeenCalled();
    });

    it("saves every role as pending, primary first without duplicates", async () => {
      clientQuery
        .mockResolvedValueOnce(result([{ "?column?": 1 }]))
        .mockResolvedValueOnce(
          result([{ code: "SUPPLIER" }, { code: "WHOLESALER" }]),
        )
        .mockResolvedValue(result());
      query.mockResolvedValueOnce(result([vendorRow()]));
      await service.create(user, {
        ...request,
        roleCodes: ["WHOLESALER", "SUPPLIER"],
      });
      const roles = clientQuery.mock.calls.find((call) =>
        String(call[0]).includes("INSERT INTO vendor_roles"),
      );
      expect(roles?.[1][1]).toEqual(["SUPPLIER", "WHOLESALER"]);
    });

    it("creates the vendor owned by the caller, audits, and returns it", async () => {
      clientQuery
        .mockResolvedValueOnce(result([{ "?column?": 1 }]))
        .mockResolvedValueOnce(result([{ code: "SUPPLIER" }]))
        .mockResolvedValue(result());
      query.mockResolvedValueOnce(result([vendorRow()]));
      const view = await service.create(user, request);
      const insert = clientQuery.mock.calls[2];
      expect(insert[0]).toContain("INSERT INTO vendors");
      expect(insert[1].slice(1)).toEqual([
        "u1",
        "SUPPLIER",
        "Sharma Electricals Pvt Ltd",
        "IN",
      ]);
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({ action: "vendor.create" }),
        expect.anything(),
      );
      expect(view).toMatchObject({ id: "v1", languages: [] });
    });
  });

  describe("get / listMine", () => {
    it("scopes reads to the owner and 404s otherwise", async () => {
      query.mockResolvedValueOnce(result());
      await expect(service.get(user, "other")).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(query.mock.calls[0][1]).toEqual(["other", "u1"]);
    });

    it("lists the caller's vendors", async () => {
      query.mockResolvedValueOnce(result([vendorRow()]));
      await expect(service.listMine(user)).resolves.toHaveLength(1);
      expect(query.mock.calls[0][1]).toEqual(["u1"]);
    });
  });

  describe("update", () => {
    it("404s for a vendor the caller does not own", async () => {
      clientQuery.mockResolvedValueOnce(result());
      await expect(
        service.update(user, "v9", { legalName: "X" }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(clientQuery).toHaveBeenCalledTimes(1);
    });

    it("updates and audits only the fields sent", async () => {
      clientQuery
        .mockResolvedValueOnce(result([{}]))
        .mockResolvedValue(result());
      query.mockResolvedValueOnce(result([vendorRow({ description: "d" })]));
      await service.update(user, "v1", {
        description: "d",
        languages: ["en", "hi"],
      });
      const profile = clientQuery.mock.calls[2];
      expect(profile[1]).toEqual(["v1", null, "d", '["en","hi"]', null]);
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { fields: ["description", "languages"] },
        }),
        expect.anything(),
      );
    });
  });

  describe("getPublic", () => {
    const publicRow = (roles: unknown[]) => ({
      id: "v1",
      legal_name: "Sharma Electricals Pvt Ltd",
      registration_country: "IN",
      trading_name: "Sharma Electricals",
      description: null,
      languages: null,
      year_established: 2012,
      roles,
    });

    it("shows the vendor with its verified roles only", async () => {
      query.mockResolvedValueOnce(
        result([
          publicRow([
            { roleCode: "SUPPLIER", label: "Supplier", offerType: "products" },
          ]),
        ]),
      );
      const view = await service.getPublic("v1");
      expect(String(query.mock.calls[0][0])).toContain("r.status = 'verified'");
      expect(view).toMatchObject({
        name: "Sharma Electricals",
        languages: [],
        roles: [{ roleCode: "SUPPLIER" }],
      });
      expect(view).not.toHaveProperty("ownerUserId");
    });

    it("404s a vendor with no verified role, and an unknown vendor", async () => {
      query.mockResolvedValueOnce(result([publicRow([])]));
      await expect(service.getPublic("v1")).rejects.toBeInstanceOf(
        NotFoundException,
      );
      query.mockResolvedValueOnce(result());
      await expect(service.getPublic("nope")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("validation", () => {
    const errors = async (cls: new () => object, plain: object) =>
      (await validate(plainToInstance(cls, plain))).map((e) => e.property);

    it("requires country, type and legal name on create", async () => {
      expect(await errors(CreateVendorDto, {})).toEqual(
        expect.arrayContaining([
          "registrationCountry",
          "businessType",
          "legalName",
        ]),
      );
      expect(
        await errors(CreateVendorDto, {
          registrationCountry: "india",
          businessType: "shop",
          legalName: "  ",
        }),
      ).toEqual(
        expect.arrayContaining([
          "registrationCountry",
          "businessType",
          "legalName",
        ]),
      );
    });

    it("accepts a valid create and rejects nulls and unsupported languages on update", async () => {
      expect(
        await errors(CreateVendorDto, {
          registrationCountry: "IN",
          businessType: "CONTRACTOR",
          roleCodes: ["WHOLESALER"],
          legalName: "A",
        }),
      ).toEqual([]);
      expect(
        await errors(CreateVendorDto, {
          registrationCountry: "IN",
          businessType: "CONTRACTOR",
          roleCodes: ["wholesaler"],
          legalName: "A",
        }),
      ).toEqual(["roleCodes"]);
      expect(
        await errors(UpdateVendorDto, { legalName: null, languages: ["fr"] }),
      ).toEqual(expect.arrayContaining(["legalName", "languages"]));
      expect(await errors(UpdateVendorDto, {})).toEqual([]);
    });
  });
});
