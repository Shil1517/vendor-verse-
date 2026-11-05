import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { AdminTaxonomyService } from "./admin-taxonomy.service";
import {
  assertAliases,
  assertConfiguration,
  assertLocalizedNames,
} from "./category-input";

const actor: AuthenticatedUser = { userId: "admin-1", sessionId: "s1" };
const result = (rows: unknown[] = [], rowCount = rows.length) => ({
  rows,
  rowCount,
});
const row = (over: Record<string, unknown> = {}) => ({
  id: "c1",
  industry_id: "i1",
  current_version: 1,
  lifecycle: "DRAFT",
  always_show: false,
  sort_order: 1,
  merged_into_category_id: null,
  name: "Plumbing",
  localized_names: {},
  aliases: [],
  configuration: {},
  ...over,
});

describe("AdminTaxonomyService", () => {
  let clientQuery: jest.Mock;
  let record: jest.Mock;
  let service: AdminTaxonomyService;

  beforeEach(() => {
    clientQuery = jest.fn();
    record = jest.fn().mockResolvedValue(undefined);
    const database = {
      query: jest.fn(),
      transaction: (operation: (client: unknown) => unknown) =>
        operation({ query: clientQuery }),
    } as unknown as DatabaseService;
    service = new AdminTaxonomyService(database, {
      record,
    } as unknown as AuditService);
  });

  describe("createCategory", () => {
    it("rejects an unknown industry", async () => {
      clientQuery.mockResolvedValueOnce(result());
      await expect(
        service.createCategory(actor, { industryId: "i1", name: "Plumbing" }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(record).not.toHaveBeenCalled();
    });

    it("creates a DRAFT at version 1 and audits it", async () => {
      clientQuery
        .mockResolvedValueOnce(result([{}]))
        .mockResolvedValueOnce(result())
        .mockResolvedValueOnce(result())
        .mockResolvedValueOnce(result([row()]));
      const created = await service.createCategory(actor, {
        industryId: "i1",
        name: "Plumbing",
      });
      expect(created.lifecycle).toBe("DRAFT");
      expect(clientQuery.mock.calls[1][0]).toContain("'DRAFT'");
      expect(clientQuery.mock.calls[2][1]).toEqual(
        expect.arrayContaining([1, "Plumbing", "admin-1"]),
      );
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({ action: "taxonomy.category_created" }),
        expect.anything(),
      );
    });

    it("rejects a malformed marketRules before touching the database", async () => {
      await expect(
        service.createCategory(actor, {
          industryId: "i1",
          name: "x",
          configuration: { marketRules: [{ countryCode: "india" }] },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(clientQuery).not.toHaveBeenCalled();
    });
  });

  describe("updateCategory", () => {
    it("rejects an empty change", async () => {
      await expect(
        service.updateCategory(actor, "c1", {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("404s for an unknown category", async () => {
      clientQuery.mockResolvedValueOnce(result());
      await expect(
        service.updateCategory(actor, "c1", { name: "x" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("refuses to edit a retired category", async () => {
      clientQuery.mockResolvedValueOnce(
        result([row({ lifecycle: "RETIRED" })]),
      );
      await expect(
        service.updateCategory(actor, "c1", { name: "x" }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("inserts version 2 carrying over omitted fields", async () => {
      clientQuery
        .mockResolvedValueOnce(
          result([
            row({ aliases: [{ value: "pipes" }], configuration: { a: 1 } }),
          ]),
        )
        .mockResolvedValueOnce(result())
        .mockResolvedValueOnce(result())
        .mockResolvedValueOnce(
          result([row({ current_version: 2, name: "Plumbers" })]),
        );
      const updated = await service.updateCategory(actor, "c1", {
        name: "Plumbers",
      });
      const inserted = clientQuery.mock.calls[1][1];
      expect(inserted[2]).toBe(2);
      expect(inserted[3]).toBe("Plumbers");
      expect(inserted[5]).toBe(JSON.stringify([{ value: "pipes" }]));
      expect(inserted[6]).toBe(JSON.stringify({ a: 1 }));
      expect(updated.version).toBe(2);
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { changed: ["name"] } }),
        expect.anything(),
      );
    });

    it("alwaysShow alone creates no new version", async () => {
      clientQuery
        .mockResolvedValueOnce(result([row({ lifecycle: "ACTIVE" })]))
        .mockResolvedValueOnce(result())
        .mockResolvedValueOnce(result([row({ always_show: true })]));
      await service.updateCategory(actor, "c1", { alwaysShow: true });
      expect(
        clientQuery.mock.calls.some((call) =>
          String(call[0]).includes("INSERT INTO category_config_versions"),
        ),
      ).toBe(false);
    });
  });

  describe("changeLifecycle", () => {
    it.each([
      ["DRAFT", "RESTRICTED"],
      ["ACTIVE", "DRAFT"],
      ["RETIRED", "ACTIVE"],
    ])("refuses %s to %s", async (from, to) => {
      clientQuery.mockResolvedValueOnce(result([row({ lifecycle: from })]));
      await expect(
        service.changeLifecycle(actor, "c1", to as never, "why"),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(record).not.toHaveBeenCalled();
    });

    it("activates a draft and audits the reason", async () => {
      clientQuery
        .mockResolvedValueOnce(result([row()]))
        .mockResolvedValueOnce(result())
        .mockResolvedValueOnce(result([row({ lifecycle: "ACTIVE" })]));
      const changed = await service.changeLifecycle(
        actor,
        "c1",
        "ACTIVE",
        "Ready",
      );
      expect(changed.lifecycle).toBe("ACTIVE");
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: "Ready",
          metadata: { from: "DRAFT", to: "ACTIVE" },
        }),
        expect.anything(),
      );
    });
  });

  describe("mergeCategory", () => {
    it("refuses to merge into itself", async () => {
      await expect(
        service.mergeCategory(actor, "c1", "c1", "dup"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("refuses a retired or draft target", async () => {
      clientQuery
        .mockResolvedValueOnce(result([row({ id: "c1", lifecycle: "ACTIVE" })]))
        .mockResolvedValueOnce(result([row({ id: "c2", lifecycle: "DRAFT" })]));
      await expect(
        service.mergeCategory(actor, "c1", "c2", "dup"),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("retires the source and records the target", async () => {
      clientQuery
        .mockResolvedValueOnce(result([row({ id: "c1", lifecycle: "ACTIVE" })]))
        .mockResolvedValueOnce(result([row({ id: "c2", lifecycle: "ACTIVE" })]))
        .mockResolvedValueOnce(result())
        .mockResolvedValueOnce(
          result([
            row({ lifecycle: "RETIRED", merged_into_category_id: "c2" }),
          ]),
        );
      const merged = await service.mergeCategory(actor, "c1", "c2", "dup");
      expect(merged.mergedIntoCategoryId).toBe("c2");
      expect(clientQuery.mock.calls[2][1]).toEqual(["c1", "c2"]);
    });
  });

  describe("reorderCategories", () => {
    it("rejects a list that is not exactly the industry's categories", async () => {
      clientQuery.mockResolvedValueOnce(result([{ id: "a" }, { id: "b" }]));
      await expect(
        service.reorderCategories(actor, "i1", ["a"]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("applies the new order", async () => {
      clientQuery
        .mockResolvedValueOnce(result([{ id: "a" }, { id: "b" }]))
        .mockResolvedValueOnce(result());
      await service.reorderCategories(actor, "i1", ["b", "a"]);
      expect(clientQuery.mock.calls[1][1]).toEqual([["b", "a"]]);
      expect(record).toHaveBeenCalled();
    });
  });

  describe("subcategories", () => {
    it("will not add to a retired category", async () => {
      clientQuery.mockResolvedValueOnce(
        result([row({ lifecycle: "RETIRED" })]),
      );
      await expect(
        service.createSubcategory(actor, "c1", { name: "Taps" }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("404s when editing an unknown subcategory", async () => {
      clientQuery.mockResolvedValueOnce(result());
      await expect(
        service.updateSubcategory(actor, "s1", { name: "x" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

describe("category input validators", () => {
  it("accepts good localized names and rejects bad locales", () => {
    expect(assertLocalizedNames({ hi: "प्लंबर" })).toEqual({ hi: "प्लंबर" });
    expect(() => assertLocalizedNames({ "!!": "x" })).toThrow(
      BadRequestException,
    );
    expect(() => assertLocalizedNames({ hi: "" })).toThrow(BadRequestException);
  });

  it("validates aliases", () => {
    expect(assertAliases([{ value: " pipes ", locale: "en" }])).toEqual([
      { value: "pipes", locale: "en" },
    ]);
    expect(() => assertAliases(["pipes"])).toThrow(BadRequestException);
  });

  it("validates marketRules only", () => {
    expect(
      assertConfiguration({
        marketRules: [{ countryCode: "IN", enabled: true, cityId: null }],
        anything: { goes: true },
      }),
    ).toBeDefined();
    expect(() => assertConfiguration([])).toThrow(BadRequestException);
    expect(() =>
      assertConfiguration({ marketRules: [{ countryCode: "IN" }] }),
    ).toThrow(BadRequestException);
  });
});
