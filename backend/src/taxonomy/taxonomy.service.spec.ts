import { NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { TaxonomyService } from "./taxonomy.service";

const result = (rows: unknown[]) => ({ rows, rowCount: rows.length });

const category = (over: Record<string, unknown> = {}) => ({
  id: "c1",
  industry_id: "i1",
  current_version: 2,
  always_show: true,
  name: "Electricians",
  localized_names: { hi: "बिजली मिस्त्री" },
  aliases: ["Electrical work", { value: "Wiring", locale: "en" }, 7],
  configuration: {
    marketRules: [{ countryCode: "IN", enabled: true }],
    bookingModes: ["RFQ"],
    attributeSchema: { type: "object" },
    verificationRules: [{ countryCode: "IN", minimumLevel: "L1" }],
    cancellationPolicyId: "internal",
  },
  ...over,
});

describe("TaxonomyService", () => {
  let query: jest.Mock;
  let service: TaxonomyService;
  const india = { countryCode: "IN" };

  beforeEach(() => {
    query = jest.fn();
    service = new TaxonomyService({ query } as unknown as DatabaseService);
  });

  describe("listCategories", () => {
    it("returns market-enabled always-show categories with subcategories", async () => {
      query
        .mockResolvedValueOnce(result([category()]))
        .mockResolvedValueOnce(
          result([
            {
              id: "s1",
              category_id: "c1",
              name: "Wiring",
              localized_names: {},
            },
          ]),
        );
      const { items } = await service.listCategories(india);
      expect(items).toEqual([
        {
          categoryId: "c1",
          industryId: "i1",
          name: "Electricians",
          localizedNames: { hi: "बिजली मिस्त्री" },
          aliases: [
            { value: "Electrical work" },
            { value: "Wiring", locale: "en" },
          ],
          version: 2,
          subcategories: [
            { subcategoryId: "s1", name: "Wiring", localizedNames: {} },
          ],
        },
      ]);
    });

    it("hides categories without always-show until listings exist", async () => {
      query.mockResolvedValueOnce(result([category({ always_show: false })]));
      expect((await service.listCategories(india)).items).toEqual([]);
      expect(query).toHaveBeenCalledTimes(1);
    });

    it("hides categories not enabled in the requested market", async () => {
      query.mockResolvedValueOnce(result([category()]));
      expect(
        (await service.listCategories({ countryCode: "AE" })).items,
      ).toEqual([]);
    });

    it("filters by industry through a bound parameter", async () => {
      query.mockResolvedValueOnce(result([]));
      await service.listCategories(india, "i1");
      expect(query.mock.calls[0][0]).toContain("category.industry_id = $1");
      expect(query.mock.calls[0][1]).toEqual(["i1"]);
    });
  });

  describe("getCategory", () => {
    it("exposes only the public configuration keys", async () => {
      query
        .mockResolvedValueOnce(result([category()]))
        .mockResolvedValueOnce(result([]));
      const found = await service.getCategory("c1", india);
      expect(found.configuration).toEqual({
        bookingModes: ["RFQ"],
        attributeSchema: { type: "object" },
      });
    });

    it("returns 404 when the category is unavailable in the market", async () => {
      query.mockResolvedValueOnce(result([category()]));
      await expect(
        service.getCategory("c1", { countryCode: "AE" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("returns 404 when no active category matches", async () => {
      query.mockResolvedValueOnce(result([]));
      await expect(service.getCategory("c1", india)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("listIndustries", () => {
    it("returns industries of visible categories only", async () => {
      query
        .mockResolvedValueOnce(
          result([
            category(),
            category({ id: "c2" }),
            category({ id: "c3", industry_id: "i2", always_show: false }),
          ]),
        )
        .mockResolvedValueOnce(
          result([
            {
              id: "i1",
              name: "Construction",
              localized_names: {},
              phase: "P1",
            },
          ]),
        );
      const { items } = await service.listIndustries(india);
      expect(query.mock.calls[1][1]).toEqual([["i1"]]);
      expect(items).toEqual([
        {
          industryId: "i1",
          name: "Construction",
          localizedNames: {},
          phase: "P1",
        },
      ]);
    });

    it("skips the industry query when nothing is visible", async () => {
      query.mockResolvedValueOnce(result([]));
      expect(await service.listIndustries(india)).toEqual({ items: [] });
      expect(query).toHaveBeenCalledTimes(1);
    });
  });
});
