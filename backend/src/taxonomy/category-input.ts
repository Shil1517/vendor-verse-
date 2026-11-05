import { BadRequestException } from "@nestjs/common";

export const CATEGORY_LIFECYCLES = [
  "DRAFT",
  "ACTIVE",
  "RESTRICTED",
  "RETIRED",
] as const;
export type CategoryLifecycle = (typeof CATEGORY_LIFECYCLES)[number];

/**
 * Allowed lifecycle moves (F-TAX-02: Draft, Active, Restricted, Retired).
 * Retired is final: a retired category keeps its history and is never
 * reactivated (create a new category instead). Merge also retires.
 */
export const LIFECYCLE_TRANSITIONS: Record<
  CategoryLifecycle,
  readonly CategoryLifecycle[]
> = {
  DRAFT: ["ACTIVE", "RETIRED"],
  ACTIVE: ["RESTRICTED", "RETIRED"],
  RESTRICTED: ["ACTIVE", "RETIRED"],
  RETIRED: [],
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** `{ "hi": "..." }`: locale to non-empty text. */
export function assertLocalizedNames(
  value: unknown,
  field = "localizedNames",
): Record<string, string> {
  if (!isPlainObject(value)) {
    throw new BadRequestException(`${field} must be an object`);
  }
  for (const [locale, text] of Object.entries(value)) {
    if (
      !/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(locale) ||
      typeof text !== "string" ||
      text.trim().length === 0 ||
      text.length > 120
    ) {
      throw new BadRequestException(
        `${field} must map locale codes to text of 1 to 120 characters`,
      );
    }
  }
  return value as Record<string, string>;
}

/** `[{ "value": "plumber", "locale": "en" }]` */
export function assertAliases(
  value: unknown,
): Array<{ value: string; locale?: string }> {
  if (!Array.isArray(value) || value.length > 50) {
    throw new BadRequestException("aliases must be a list of at most 50 items");
  }
  return value.map((alias) => {
    if (
      !isPlainObject(alias) ||
      typeof alias.value !== "string" ||
      alias.value.trim().length === 0 ||
      alias.value.length > 120 ||
      (alias.locale !== undefined && typeof alias.locale !== "string")
    ) {
      throw new BadRequestException(
        "each alias needs a value of 1 to 120 characters and an optional locale",
      );
    }
    return {
      value: alias.value.trim(),
      ...(alias.locale !== undefined ? { locale: alias.locale } : {}),
    };
  });
}

/**
 * Only `marketRules` is validated here, because the public browse reads it
 * (market-eligibility.ts). The other configuration keys belong to the category
 * schema validator (F-TAX-03, F-TAX-08) and are stored as sent.
 */
export function assertConfiguration(value: unknown): Record<string, unknown> {
  if (!isPlainObject(value)) {
    throw new BadRequestException("configuration must be an object");
  }
  const rules = value.marketRules;
  if (rules !== undefined) {
    const valid =
      Array.isArray(rules) &&
      rules.every(
        (rule) =>
          isPlainObject(rule) &&
          typeof rule.countryCode === "string" &&
          /^[A-Z]{2}$/.test(rule.countryCode) &&
          typeof rule.enabled === "boolean" &&
          (rule.regionId === undefined ||
            rule.regionId === null ||
            typeof rule.regionId === "string") &&
          (rule.cityId === undefined ||
            rule.cityId === null ||
            typeof rule.cityId === "string"),
      );
    if (!valid) {
      throw new BadRequestException(
        "configuration.marketRules must be a list of { countryCode (two capital letters), enabled, regionId?, cityId? }",
      );
    }
  }
  return value;
}
