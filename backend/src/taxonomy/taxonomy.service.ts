import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { isEnabledInMarket, Market } from "./market-eligibility";

interface CategoryRow {
  id: string;
  industry_id: string;
  current_version: number;
  always_show: boolean;
  name: string;
  localized_names: Record<string, string>;
  aliases: unknown;
  configuration: Record<string, unknown>;
}

interface SubcategoryRow {
  id: string;
  category_id: string;
  name: string;
  localized_names: Record<string, string>;
}

interface IndustryRow {
  id: string;
  name: string;
  localized_names: Record<string, string>;
  phase: "P1" | "P2" | "P3";
}

export interface PublicSubcategory {
  subcategoryId: string;
  name: string;
  localizedNames: Record<string, string>;
}

export interface PublicCategorySummary {
  categoryId: string;
  industryId: string;
  name: string;
  localizedNames: Record<string, string>;
  aliases: Array<{ value: string; locale?: string | null }>;
  version: number;
  subcategories: PublicSubcategory[];
}

export interface PublicCategory extends PublicCategorySummary {
  configuration: Record<string, unknown>;
}

export interface PublicIndustry {
  industryId: string;
  name: string;
  localizedNames: Record<string, string>;
  phase: "P1" | "P2" | "P3";
}

/** Configuration keys that form the public, schema-driven form projection (F-TAX-08). */
const PUBLIC_CONFIGURATION_KEYS = [
  "bookingModes",
  "availabilityModels",
  "attributeSchema",
  "rfqSchema",
] as const;

const ACTIVE_CATEGORIES = `
  SELECT category.id, category.industry_id, category.current_version,
         category.always_show, version.name, version.localized_names,
         version.aliases, version.configuration
  FROM categories AS category
  JOIN category_config_versions AS version
    ON version.category_id = category.id
   AND version.version_number = category.current_version
  JOIN industries AS industry ON industry.id = category.industry_id
  WHERE category.lifecycle = 'ACTIVE'`;

@Injectable()
export class TaxonomyService {
  constructor(private readonly database: DatabaseService) {}

  async listIndustries(market: Market): Promise<{ items: PublicIndustry[] }> {
    const categories = await this.visibleCategories(market);
    const industryIds = [...new Set(categories.map((c) => c.industry_id))];
    if (industryIds.length === 0) {
      return { items: [] };
    }
    const result = await this.database.query<IndustryRow>(
      `SELECT id, name, localized_names, phase
       FROM industries
       WHERE id = ANY($1::uuid[])
       ORDER BY sort_order, id`,
      [industryIds],
    );
    return {
      items: result.rows.map((row) => ({
        industryId: row.id,
        name: row.name,
        localizedNames: row.localized_names,
        phase: row.phase,
      })),
    };
  }

  async listCategories(
    market: Market,
    industryId?: string,
  ): Promise<{ items: PublicCategorySummary[] }> {
    const categories = await this.visibleCategories(market, industryId);
    const subcategories = await this.subcategoriesFor(
      categories.map((c) => c.id),
    );
    return {
      items: categories.map((row) =>
        this.toSummary(row, subcategories.get(row.id) ?? []),
      ),
    };
  }

  async getCategory(
    categoryId: string,
    market: Market,
  ): Promise<PublicCategory> {
    const [row] = await this.visibleCategories(market, undefined, categoryId);
    if (!row) {
      throw new NotFoundException(
        "Category is unavailable for browse in this market",
      );
    }
    const subcategories = await this.subcategoriesFor([row.id]);
    const configuration: Record<string, unknown> = {};
    for (const key of PUBLIC_CONFIGURATION_KEYS) {
      if (row.configuration[key] !== undefined) {
        configuration[key] = row.configuration[key];
      }
    }
    return {
      ...this.toSummary(row, subcategories.get(row.id) ?? []),
      configuration,
    };
  }

  /**
   * Active categories enabled in the market. A category must also have eligible
   * listings there unless a Super Admin set always-show; the listings module does
   * not exist yet, so for now only always-show categories qualify.
   */
  private async visibleCategories(
    market: Market,
    industryId?: string,
    categoryId?: string,
  ): Promise<CategoryRow[]> {
    const values: string[] = [];
    let filter = "";
    if (industryId) {
      values.push(industryId);
      filter += ` AND category.industry_id = $${values.length}`;
    }
    if (categoryId) {
      values.push(categoryId);
      filter += ` AND category.id = $${values.length}`;
    }
    const result = await this.database.query<CategoryRow>(
      `${ACTIVE_CATEGORIES}${filter}
       ORDER BY industry.sort_order, category.sort_order, category.id`,
      values,
    );
    return result.rows.filter(
      (row) =>
        row.always_show &&
        isEnabledInMarket(row.configuration?.marketRules, market),
    );
  }

  private async subcategoriesFor(
    categoryIds: string[],
  ): Promise<Map<string, PublicSubcategory[]>> {
    const grouped = new Map<string, PublicSubcategory[]>();
    if (categoryIds.length === 0) {
      return grouped;
    }
    const result = await this.database.query<SubcategoryRow>(
      `SELECT id, category_id, name, localized_names
       FROM subcategories
       WHERE category_id = ANY($1::uuid[])
       ORDER BY category_id, sort_order, id`,
      [categoryIds],
    );
    for (const row of result.rows) {
      const list = grouped.get(row.category_id) ?? [];
      list.push({
        subcategoryId: row.id,
        name: row.name,
        localizedNames: row.localized_names,
      });
      grouped.set(row.category_id, list);
    }
    return grouped;
  }

  private toSummary(
    row: CategoryRow,
    subcategories: PublicSubcategory[],
  ): PublicCategorySummary {
    return {
      categoryId: row.id,
      industryId: row.industry_id,
      name: row.name,
      localizedNames: row.localized_names,
      aliases: this.toAliases(row.aliases),
      version: row.current_version,
      subcategories,
    };
  }

  private toAliases(
    aliases: unknown,
  ): Array<{ value: string; locale?: string | null }> {
    if (!Array.isArray(aliases)) {
      return [];
    }
    return aliases.flatMap((alias) => {
      if (typeof alias === "string") {
        return [{ value: alias }];
      }
      if (
        typeof alias === "object" &&
        alias !== null &&
        typeof (alias as { value?: unknown }).value === "string"
      ) {
        const { value, locale } = alias as { value: string; locale?: string };
        return [{ value, ...(locale !== undefined ? { locale } : {}) }];
      }
      return [];
    });
  }
}
