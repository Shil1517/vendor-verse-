import { BadRequestException, NotFoundException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DatabaseService } from "../database/database.service";
import { DiscoverService, likePattern, priceView } from "./discover.service";
import { SearchListingsQueryDto } from "./dto/discover.dto";

const result = (rows: unknown[] = []) => ({ rows, rowCount: rows.length });

function harness() {
  const query = jest.fn();
  const database = { query } as unknown as DatabaseService;
  return { query, service: new DiscoverService(database) };
}

const query = (over: Partial<SearchListingsQueryDto> = {}) =>
  Object.assign(new SearchListingsQueryDto(), { countryCode: "IN", ...over });

describe("priceView (F-DSC-05)", () => {
  const base = {
    price_on_request: false,
    price_min_minor: null,
    price_max_minor: null,
    price_currency: null,
    price_unit: null,
  };
  it("never turns a missing price into zero", () => {
    expect(priceView(base)).toEqual({
      state: "not_provided",
      minMinor: null,
      maxMinor: null,
      currency: null,
      unit: null,
    });
  });
  it("reports price on request", () => {
    expect(priceView({ ...base, price_on_request: true }).state).toBe(
      "on_request",
    );
  });
  it("reports a stated range in minor units", () => {
    expect(
      priceView({
        ...base,
        price_min_minor: "50000",
        price_max_minor: "150000",
        price_currency: "INR",
        price_unit: "visit",
      }),
    ).toEqual({
      state: "stated",
      minMinor: 50000,
      maxMinor: 150000,
      currency: "INR",
      unit: "visit",
    });
  });
});

describe("likePattern", () => {
  it("matches user text literally", () => {
    expect(likePattern("50%_off\\")).toBe("%50\\%\\_off\\\\%");
  });
});

describe("SearchListingsQueryDto", () => {
  it("requires a valid country code and caps the page size", async () => {
    const bad = plainToInstance(SearchListingsQueryDto, {
      countryCode: "india",
      limit: "500",
    });
    const fields = (await validate(bad)).map((e) => e.property);
    expect(fields).toEqual(expect.arrayContaining(["countryCode", "limit"]));
  });
  it("coerces query-string numbers and booleans", async () => {
    const ok = plainToInstance(SearchListingsQueryDto, {
      countryCode: "IN",
      minPriceMinor: "100",
      instantOnly: "true",
    });
    expect(await validate(ok)).toEqual([]);
    expect(ok.minPriceMinor).toBe(100);
    expect(ok.instantOnly).toBe(true);
  });
});

describe("DiscoverService.search", () => {
  const live = (h: ReturnType<typeof harness>, rules: unknown[]) =>
    h.query
      .mockResolvedValueOnce(result([{ id: "country1" }]))
      .mockResolvedValueOnce(result([{ status: "live" }]))
      .mockResolvedValueOnce(result([{ id: "cat1", rules }]));

  it("returns nothing, flagged, when the market is not live (F-GEO-03)", async () => {
    const h = harness();
    h.query
      .mockResolvedValueOnce(result([{ id: "country1" }]))
      .mockResolvedValueOnce(result([{ status: "not_live" }]));
    await expect(h.service.search(query())).resolves.toEqual({
      items: [],
      nextCursor: null,
      marketLive: false,
    });
    expect(h.query).toHaveBeenCalledTimes(2);
  });

  it("treats an unknown country as not live", async () => {
    const h = harness();
    h.query.mockResolvedValueOnce(result([]));
    expect((await h.service.search(query())).marketLive).toBe(false);
  });

  it("rejects a city that is not in the country", async () => {
    const h = harness();
    h.query
      .mockResolvedValueOnce(result([{ id: "country1" }]))
      .mockResolvedValueOnce(result([]));
    await expect(
      h.service.search(
        query({ cityId: "11111111-1111-4111-8111-111111111111" }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a malformed cursor", async () => {
    const h = harness();
    live(h, [{ countryCode: "IN", enabled: true }]);
    await expect(
      h.service.search(
        query({ cursor: Buffer.from("-3").toString("base64url") }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns no items when no category is enabled in the market", async () => {
    const h = harness();
    live(h, [{ countryCode: "IN", enabled: false }]);
    await expect(h.service.search(query())).resolves.toEqual({
      items: [],
      nextCursor: null,
      marketLive: true,
    });
  });

  it("maps rows, labels coverage and pages with a cursor", async () => {
    const h = harness();
    const row = (id: string) => ({
      id,
      title: `Listing ${id}`,
      listing_type: "service",
      category_id: "cat1",
      category_name: "Electrical",
      vendor_id: "v1",
      vendor_name: "Sharma Electricals",
      roles: ["electrician"],
      price_on_request: true,
      price_min_minor: null,
      price_max_minor: null,
      price_currency: null,
      price_unit: null,
      instant_booking_enabled: false,
      coverage_rank: 3,
      title_hit: true,
      description_hit: false,
      vendor_hit: false,
    });
    live(h, [{ countryCode: "IN", enabled: true }]);
    h.query.mockResolvedValueOnce(result([row("a"), row("b"), row("c")]));
    const page = await h.service.search(query({ limit: 2, q: "elec" }));
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).not.toBeNull();
    expect(page.items[0].matchedOn).toEqual(["coverage:country", "title"]);
    expect(page.items[0].price.state).toBe("on_request");
    const sql = h.query.mock.calls[3][0] as string;
    expect(sql).toContain("content_state = 'approved'");
    // plan tier and sponsorship are not ranking signals (GM-21, GM-22)
    expect(sql).not.toMatch(/subscription|plan_tier|sponsor/i);
  });
});

describe("DiscoverService.getListing", () => {
  it("answers 404 for a listing that is not publicly eligible", async () => {
    const h = harness();
    h.query.mockResolvedValueOnce(result([]));
    await expect(h.service.getListing("l1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("labels availability not_provided when the vendor gave none", async () => {
    const h = harness();
    h.query.mockResolvedValueOnce(
      result([
        {
          id: "l1",
          title: "T",
          description: null,
          listing_type: "service",
          category_id: "c",
          category_name: "C",
          configuration: { bookingModes: ["INSTANT"] },
          vendor_id: "v",
          vendor_name: "V",
          vendor_description: null,
          roles: null,
          price_on_request: false,
          price_min_minor: null,
          price_max_minor: null,
          price_currency: null,
          price_unit: null,
          time_zone: null,
          instant_booking_enabled: false,
          attributes: {},
          service_areas: [],
          availability_model: null,
          availability_time_zone: null,
        },
      ]),
    );
    const listing = await h.service.getListing("l1");
    expect(listing.availability).toEqual({ state: "not_provided" });
    expect(listing.price.state).toBe("not_provided");
    expect(listing.bookingModes).toEqual(["INSTANT"]);
  });
});
