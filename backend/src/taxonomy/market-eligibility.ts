export interface Market {
  countryCode: string;
  regionId?: string;
  cityId?: string;
}

interface MarketRule {
  countryCode: string;
  regionId?: string | null;
  cityId?: string | null;
  enabled: boolean;
}

function asRules(value: unknown): MarketRule[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (rule): rule is MarketRule =>
      typeof rule === "object" &&
      rule !== null &&
      typeof (rule as MarketRule).countryCode === "string" &&
      typeof (rule as MarketRule).enabled === "boolean",
  );
}

const specificity = (rule: MarketRule): number =>
  rule.cityId ? 2 : rule.regionId ? 1 : 0;

/**
 * Whether a category's `marketRules` (category configuration) enable it in the
 * requested market. A rule applies when its country matches and any region/city
 * it names equals the requested one. The most specific applicable rule decides
 * (city, then region, then country-wide); if several rules tie, every one must
 * be enabled. No applicable rule means the category is not available.
 */
export function isEnabledInMarket(rules: unknown, market: Market): boolean {
  const applicable = asRules(rules).filter(
    (rule) =>
      rule.countryCode === market.countryCode &&
      (!rule.regionId || rule.regionId === market.regionId) &&
      (!rule.cityId || rule.cityId === market.cityId),
  );
  if (applicable.length === 0) {
    return false;
  }
  const top = Math.max(...applicable.map(specificity));
  return applicable
    .filter((rule) => specificity(rule) === top)
    .every((rule) => rule.enabled);
}
