import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PoolClient } from "pg";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import {
  assertAliases,
  assertConfiguration,
  assertLocalizedNames,
  CategoryLifecycle,
  LIFECYCLE_TRANSITIONS,
} from "./category-input";
import {
  CreateCategoryDto,
  CreateSubcategoryDto,
  UpdateCategoryDto,
  UpdateSubcategoryDto,
} from "./dto/admin-taxonomy.dto";

interface CategoryRow {
  id: string;
  industry_id: string;
  current_version: number;
  lifecycle: CategoryLifecycle;
  always_show: boolean;
  sort_order: number;
  merged_into_category_id: string | null;
  name: string;
  localized_names: Record<string, string>;
  aliases: unknown[];
  configuration: Record<string, unknown>;
}

const CATEGORY_SELECT = `
  SELECT category.id, category.industry_id, category.current_version,
         category.lifecycle, category.always_show, category.sort_order,
         category.merged_into_category_id, version.name,
         version.localized_names, version.aliases, version.configuration
  FROM categories AS category
  JOIN category_config_versions AS version
    ON version.category_id = category.id
   AND version.version_number = category.current_version`;

const toCategory = (row: CategoryRow) => ({
  categoryId: row.id,
  industryId: row.industry_id,
  lifecycle: row.lifecycle,
  alwaysShow: row.always_show,
  sortOrder: row.sort_order,
  mergedIntoCategoryId: row.merged_into_category_id,
  version: row.current_version,
  name: row.name,
  localizedNames: row.localized_names,
  aliases: row.aliases,
  configuration: row.configuration,
});

/** Admin taxonomy builder (F-TAX-02). Every method needs taxonomy.manage. */
@Injectable()
export class AdminTaxonomyService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async listCategories(filter: {
    industryId?: string;
    lifecycle?: CategoryLifecycle;
  }) {
    const values: string[] = [];
    let where = "";
    if (filter.industryId) {
      values.push(filter.industryId);
      where += ` AND category.industry_id = $${values.length}`;
    }
    if (filter.lifecycle) {
      values.push(filter.lifecycle);
      where += ` AND category.lifecycle = $${values.length}`;
    }
    const result = await this.database.query<CategoryRow>(
      `${CATEGORY_SELECT}
       WHERE true${where}
       ORDER BY category.industry_id, category.sort_order, category.id`,
      values,
    );
    return result.rows.map(toCategory);
  }

  async getCategory(categoryId: string) {
    const category = await this.database.query<CategoryRow>(
      `${CATEGORY_SELECT} WHERE category.id = $1`,
      [categoryId],
    );
    if (category.rowCount !== 1)
      throw new NotFoundException("No such category");
    const versions = await this.database.query<{
      version_number: number;
      name: string;
      created_by_user_id: string | null;
      created_at: Date;
    }>(
      `SELECT version_number, name, created_by_user_id, created_at
       FROM category_config_versions
       WHERE category_id = $1
       ORDER BY version_number DESC`,
      [categoryId],
    );
    const subcategories = await this.database.query<{
      id: string;
      name: string;
      localized_names: Record<string, string>;
      aliases: unknown[];
      sort_order: number;
    }>(
      `SELECT id, name, localized_names, aliases, sort_order
       FROM subcategories
       WHERE category_id = $1
       ORDER BY sort_order, id`,
      [categoryId],
    );
    return {
      ...toCategory(category.rows[0]),
      versions: versions.rows.map((row) => ({
        version: row.version_number,
        name: row.name,
        createdByUserId: row.created_by_user_id,
        createdAt: row.created_at,
      })),
      subcategories: subcategories.rows.map((row) => ({
        subcategoryId: row.id,
        name: row.name,
        localizedNames: row.localized_names,
        aliases: row.aliases,
        sortOrder: row.sort_order,
      })),
    };
  }

  /** New categories start as DRAFT, hidden, with version 1. */
  async createCategory(actor: AuthenticatedUser, request: CreateCategoryDto) {
    const localizedNames =
      request.localizedNames === undefined
        ? {}
        : assertLocalizedNames(request.localizedNames);
    const aliases =
      request.aliases === undefined ? [] : assertAliases(request.aliases);
    const configuration =
      request.configuration === undefined
        ? {}
        : assertConfiguration(request.configuration);

    return this.database.transaction(async (client) => {
      const industry = await client.query(
        `SELECT 1 FROM industries WHERE id = $1`,
        [request.industryId],
      );
      if (industry.rowCount !== 1) {
        throw new BadRequestException("industryId is not a known industry");
      }
      const id = randomUUID();
      await client.query(
        `INSERT INTO categories
           (id, industry_id, current_version, lifecycle, sort_order)
         VALUES ($1, $2, 1, 'DRAFT',
                 (SELECT COALESCE(MAX(sort_order), 0) + 1
                  FROM categories WHERE industry_id = $2))`,
        [id, request.industryId],
      );
      await this.insertVersion(client, actor, id, 1, {
        name: request.name,
        localizedNames,
        aliases,
        configuration,
      });
      await this.audit.record(
        {
          actorUserId: actor.userId,
          actorRole: "SUPER_ADMIN",
          action: "taxonomy.category_created",
          targetType: "category",
          targetId: id,
          metadata: { industryId: request.industryId, name: request.name },
        },
        client,
      );
      return this.load(client, id);
    });
  }

  /**
   * A change to name, aliases or configuration inserts a new immutable version;
   * omitted fields carry over. alwaysShow is a flag on the category, not versioned.
   * Deals keep the version they were made under.
   */
  async updateCategory(
    actor: AuthenticatedUser,
    categoryId: string,
    request: UpdateCategoryDto,
  ) {
    const next = {
      name: request.name,
      localizedNames:
        request.localizedNames === undefined
          ? undefined
          : assertLocalizedNames(request.localizedNames),
      aliases:
        request.aliases === undefined
          ? undefined
          : assertAliases(request.aliases),
      configuration:
        request.configuration === undefined
          ? undefined
          : assertConfiguration(request.configuration),
    };
    const versioned = Object.values(next).some((value) => value !== undefined);
    if (!versioned && request.alwaysShow === undefined) {
      throw new BadRequestException("Nothing to change");
    }

    return this.database.transaction(async (client) => {
      const current = await this.lock(client, categoryId);
      if (current.lifecycle === "RETIRED") {
        throw new ConflictException("A retired category cannot be edited");
      }
      const changed: string[] = [];
      if (versioned) {
        const version = current.current_version + 1;
        await this.insertVersion(client, actor, categoryId, version, {
          name: next.name ?? current.name,
          localizedNames: next.localizedNames ?? current.localized_names,
          aliases: next.aliases ?? current.aliases,
          configuration: next.configuration ?? current.configuration,
        });
        await client.query(
          `UPDATE categories
           SET current_version = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [categoryId, version],
        );
        changed.push(
          ...Object.entries(next)
            .filter(([, value]) => value !== undefined)
            .map(([key]) => key),
        );
      }
      if (
        request.alwaysShow !== undefined &&
        request.alwaysShow !== current.always_show
      ) {
        await client.query(
          `UPDATE categories
           SET always_show = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [categoryId, request.alwaysShow],
        );
        changed.push("alwaysShow");
      }
      if (changed.length > 0) {
        await this.audit.record(
          {
            actorUserId: actor.userId,
            actorRole: "SUPER_ADMIN",
            action: "taxonomy.category_updated",
            targetType: "category",
            targetId: categoryId,
            metadata: { changed },
          },
          client,
        );
      }
      return this.load(client, categoryId);
    });
  }

  async changeLifecycle(
    actor: AuthenticatedUser,
    categoryId: string,
    to: CategoryLifecycle,
    reason: string,
  ) {
    return this.database.transaction(async (client) => {
      const current = await this.lock(client, categoryId);
      if (!LIFECYCLE_TRANSITIONS[current.lifecycle].includes(to)) {
        throw new ConflictException(
          `A ${current.lifecycle} category cannot move to ${to}`,
        );
      }
      await client.query(
        `UPDATE categories
         SET lifecycle = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [categoryId, to],
      );
      await this.audit.record(
        {
          actorUserId: actor.userId,
          actorRole: "SUPER_ADMIN",
          action: "taxonomy.category_lifecycle_changed",
          targetType: "category",
          targetId: categoryId,
          reason,
          metadata: { from: current.lifecycle, to },
        },
        client,
      );
      return this.load(client, categoryId);
    });
  }

  /**
   * Retires the source and records where it went. Existing vendor selections,
   * listings and past deals are NOT repointed: they keep the category and
   * version they were made under, and moving live supply is a separate step.
   */
  async mergeCategory(
    actor: AuthenticatedUser,
    categoryId: string,
    intoCategoryId: string,
    reason: string,
  ) {
    if (categoryId === intoCategoryId) {
      throw new BadRequestException("A category cannot be merged into itself");
    }
    return this.database.transaction(async (client) => {
      // Lock both in a fixed order so two opposite merges cannot deadlock.
      const [first, second] = [categoryId, intoCategoryId].sort();
      const locked = new Map<string, CategoryRow>();
      locked.set(first, await this.lock(client, first));
      locked.set(second, await this.lock(client, second));
      const source = locked.get(categoryId) as CategoryRow;
      const target = locked.get(intoCategoryId) as CategoryRow;
      if (source.lifecycle === "RETIRED") {
        throw new ConflictException("The category is already retired");
      }
      if (target.lifecycle === "RETIRED" || target.lifecycle === "DRAFT") {
        throw new ConflictException(
          "The target must be an Active or Restricted category",
        );
      }
      await client.query(
        `UPDATE categories
         SET lifecycle = 'RETIRED', merged_into_category_id = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [categoryId, intoCategoryId],
      );
      await this.audit.record(
        {
          actorUserId: actor.userId,
          actorRole: "SUPER_ADMIN",
          action: "taxonomy.category_merged",
          targetType: "category",
          targetId: categoryId,
          reason,
          metadata: { intoCategoryId, from: source.lifecycle },
        },
        client,
      );
      return this.load(client, categoryId);
    });
  }

  /** `categoryIds` must be exactly the industry's categories, in the new order. */
  async reorderCategories(
    actor: AuthenticatedUser,
    industryId: string,
    categoryIds: string[],
  ) {
    return this.database.transaction(async (client) => {
      const existing = await client.query<{ id: string }>(
        `SELECT id FROM categories WHERE industry_id = $1 FOR UPDATE`,
        [industryId],
      );
      const known = new Set(existing.rows.map((row) => row.id));
      if (
        known.size === 0 ||
        known.size !== categoryIds.length ||
        !categoryIds.every((id) => known.has(id))
      ) {
        throw new BadRequestException(
          "categoryIds must list every category of the industry exactly once",
        );
      }
      await client.query(
        `UPDATE categories AS category
         SET sort_order = ordering.position, updated_at = CURRENT_TIMESTAMP
         FROM unnest($1::uuid[]) WITH ORDINALITY AS ordering(id, position)
         WHERE category.id = ordering.id`,
        [categoryIds],
      );
      await this.audit.record(
        {
          actorUserId: actor.userId,
          actorRole: "SUPER_ADMIN",
          action: "taxonomy.categories_reordered",
          targetType: "industry",
          targetId: industryId,
          metadata: { categoryIds },
        },
        client,
      );
      return { industryId, categoryIds };
    });
  }

  async createSubcategory(
    actor: AuthenticatedUser,
    categoryId: string,
    request: CreateSubcategoryDto,
  ) {
    const localizedNames =
      request.localizedNames === undefined
        ? {}
        : assertLocalizedNames(request.localizedNames);
    const aliases =
      request.aliases === undefined ? [] : assertAliases(request.aliases);
    return this.database.transaction(async (client) => {
      const category = await this.lock(client, categoryId);
      if (category.lifecycle === "RETIRED") {
        throw new ConflictException(
          "Subcategories cannot be added to a retired category",
        );
      }
      const id = randomUUID();
      await client.query(
        `INSERT INTO subcategories
           (id, category_id, name, localized_names, aliases, sort_order)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb,
                 (SELECT COALESCE(MAX(sort_order), 0) + 1
                  FROM subcategories WHERE category_id = $2))`,
        [
          id,
          categoryId,
          request.name,
          JSON.stringify(localizedNames),
          JSON.stringify(aliases),
        ],
      );
      await this.audit.record(
        {
          actorUserId: actor.userId,
          actorRole: "SUPER_ADMIN",
          action: "taxonomy.subcategory_created",
          targetType: "subcategory",
          targetId: id,
          metadata: { categoryId, name: request.name },
        },
        client,
      );
      return { subcategoryId: id, categoryId, name: request.name };
    });
  }

  async updateSubcategory(
    actor: AuthenticatedUser,
    subcategoryId: string,
    request: UpdateSubcategoryDto,
  ) {
    const localizedNames =
      request.localizedNames === undefined
        ? undefined
        : assertLocalizedNames(request.localizedNames);
    const aliases =
      request.aliases === undefined
        ? undefined
        : assertAliases(request.aliases);
    if (
      request.name === undefined &&
      localizedNames === undefined &&
      aliases === undefined
    ) {
      throw new BadRequestException("Nothing to change");
    }
    return this.database.transaction(async (client) => {
      const updated = await client.query<{ category_id: string; name: string }>(
        `UPDATE subcategories
         SET name = COALESCE($2, name),
             localized_names = COALESCE($3::jsonb, localized_names),
             aliases = COALESCE($4::jsonb, aliases),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING category_id, name`,
        [
          subcategoryId,
          request.name ?? null,
          localizedNames === undefined ? null : JSON.stringify(localizedNames),
          aliases === undefined ? null : JSON.stringify(aliases),
        ],
      );
      if (updated.rowCount !== 1) {
        throw new NotFoundException("No such subcategory");
      }
      await this.audit.record(
        {
          actorUserId: actor.userId,
          actorRole: "SUPER_ADMIN",
          action: "taxonomy.subcategory_updated",
          targetType: "subcategory",
          targetId: subcategoryId,
          metadata: { categoryId: updated.rows[0].category_id },
        },
        client,
      );
      return {
        subcategoryId,
        categoryId: updated.rows[0].category_id,
        name: updated.rows[0].name,
      };
    });
  }

  private async insertVersion(
    client: PoolClient,
    actor: AuthenticatedUser,
    categoryId: string,
    version: number,
    content: {
      name: string;
      localizedNames: Record<string, string>;
      aliases: unknown[];
      configuration: Record<string, unknown>;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO category_config_versions
         (id, category_id, version_number, name, localized_names, aliases,
          configuration, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8)`,
      [
        randomUUID(),
        categoryId,
        version,
        content.name,
        JSON.stringify(content.localizedNames),
        JSON.stringify(content.aliases),
        JSON.stringify(content.configuration),
        actor.userId,
      ],
    );
  }

  private async lock(
    client: PoolClient,
    categoryId: string,
  ): Promise<CategoryRow> {
    const result = await client.query<CategoryRow>(
      `${CATEGORY_SELECT} WHERE category.id = $1 FOR UPDATE OF category`,
      [categoryId],
    );
    if (result.rowCount !== 1) throw new NotFoundException("No such category");
    return result.rows[0];
  }

  private async load(client: PoolClient, categoryId: string) {
    const result = await client.query<CategoryRow>(
      `${CATEGORY_SELECT} WHERE category.id = $1`,
      [categoryId],
    );
    return toCategory(result.rows[0]);
  }
}
