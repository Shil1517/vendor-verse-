import { isEnabledInMarket } from "./market-eligibility";

describe("isEnabledInMarket", () => {
  const india = { countryCode: "IN" };

  it("is unavailable without any applicable rule", () => {
    expect(isEnabledInMarket(undefined, india)).toBe(false);
    expect(isEnabledInMarket("nope", india)).toBe(false);
    expect(isEnabledInMarket([], india)).toBe(false);
    expect(
      isEnabledInMarket([{ countryCode: "AE", enabled: true }], india),
    ).toBe(false);
  });

  it("ignores malformed rules", () => {
    expect(isEnabledInMarket([{ countryCode: "IN" }, null, 5], india)).toBe(
      false,
    );
  });

  it("applies a country-wide rule to every region and city", () => {
    const rules = [{ countryCode: "IN", enabled: true }];
    expect(isEnabledInMarket(rules, india)).toBe(true);
    expect(
      isEnabledInMarket(rules, { countryCode: "IN", regionId: "r1" }),
    ).toBe(true);
  });

  it("lets a region rule override the country rule", () => {
    const rules = [
      { countryCode: "IN", enabled: true },
      { countryCode: "IN", regionId: "r1", enabled: false },
    ];
    expect(isEnabledInMarket(rules, india)).toBe(true);
    expect(
      isEnabledInMarket(rules, { countryCode: "IN", regionId: "r1" }),
    ).toBe(false);
    expect(
      isEnabledInMarket(rules, { countryCode: "IN", regionId: "r2" }),
    ).toBe(true);
  });

  it("lets a city rule override the region rule", () => {
    const rules = [
      { countryCode: "IN", regionId: "r1", enabled: false },
      { countryCode: "IN", regionId: "r1", cityId: "c1", enabled: true },
    ];
    expect(
      isEnabledInMarket(rules, {
        countryCode: "IN",
        regionId: "r1",
        cityId: "c1",
      }),
    ).toBe(true);
    expect(
      isEnabledInMarket(rules, {
        countryCode: "IN",
        regionId: "r1",
        cityId: "c2",
      }),
    ).toBe(false);
  });

  it("fails closed when equally specific rules disagree", () => {
    const rules = [
      { countryCode: "IN", enabled: true },
      { countryCode: "IN", enabled: false },
    ];
    expect(isEnabledInMarket(rules, india)).toBe(false);
  });
});
