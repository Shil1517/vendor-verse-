import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { ExecutionContext } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DatabaseService } from "../database/database.service";
import { DiscoverService } from "../discover/discover.service";
import { UniversalSearchQueryDto } from "./dto/search.dto";
import { OptionalAccessTokenGuard } from "./optional-access-token.guard";
import { SearchService } from "./search.service";

const user = { userId: "user-1", sessionId: "session-1" };
const rows = (items: unknown[] = []) => ({ rows: items, rowCount: items.length });

function harness(live = true) {
  const query = jest.fn().mockResolvedValue(rows());
  const database = { query } as unknown as DatabaseService;
  const listingPage = {
    items: [
      {
        id: "l1",
        title: "Pipe repair",
        listingType: "service",
        vendor: { id: "v1", name: "Acme Plumbing", roles: ["service_provider"] },
        matchedOn: ["coverage:city", "title", "vendor"],
      },
      {
        id: "l2",
        title: "Tap fitting",
        listingType: "service",
        vendor: { id: "v1", name: "Acme Plumbing", roles: ["service_provider"] },
        matchedOn: ["coverage:city", "vendor"],
      },
      {
        id: "l3",
        title: "Valve",
        listingType: "service",
        vendor: { id: "v2", name: "Other", roles: [] },
        matchedOn: ["coverage:city", "title"],
      },
    ],
    nextCursor: null,
    marketLive: live,
  };
  const discover = {
    resolveMarket: jest.fn().mockResolvedValue({
      countryId: "c1",
      cityId: null,
      regionId: null,
      live,
    }),
    enabledCategoryIds: jest.fn().mockResolvedValue(["cat-1"]),
    search: jest.fn().mockResolvedValue(listingPage),
  };
  const service = new SearchService(
    database,
    discover as unknown as DiscoverService,
  );
  return { query, discover, service };
}

const request = (over: Partial<UniversalSearchQueryDto> = {}) =>
  Object.assign(new UniversalSearchQueryDto(), {
    q: "plumb",
    countryCode: "IN",
    ...over,
  });

describe("SearchService.search (F-DSC-02, D-025)", () => {
  it("returns public sections only for an anonymous caller", async () => {
    const { service, query } = harness();
    const result = await service.search(request(), undefined);
    expect(result.signedIn).toBe(false);
    expect(Object.keys(result.sections).sort()).toEqual([
      "category",
      "product",
      "service",
      "vendor",
    ]);
    // Only the category query touches the database; no private table is read.
    const sql = query.mock.calls.map((call) => String(call[0])).join("\n");
    expect(sql).not.toMatch(/\b(rfqs|bookings|contracts|purchase_orders)\b/);
  });

  it("rejects a private type without a token", async () => {
    const { service } = harness();
    await expect(
      service.search(request({ types: ["booking"] }), undefined),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("adds the four private sections for a signed-in caller, scoped to that caller", async () => {
    const { service, query } = harness();
    const result = await service.search(request(), user);
    expect(result.signedIn).toBe(true);
    expect(Object.keys(result.sections)).toEqual(
      expect.arrayContaining(["rfq", "booking", "contract", "purchase_order"]),
    );
    const privateCalls = query.mock.calls.filter((call) =>
      /FROM (rfqs|bookings|contracts|purchase_orders) AS/.test(String(call[0])),
    );
    expect(privateCalls).toHaveLength(4);
    for (const [sql, params] of privateCalls) {
      expect(params[0]).toBe(user.userId); // $1 is always the caller
      expect(String(sql)).toMatch(/\$1/);
    }
  });

  it("keeps vendors from seeing drafts or other recipients' RFQs", async () => {
    const { service, query } = harness();
    await service.search(request({ types: ["rfq", "booking", "contract"] }), user);
    const text = query.mock.calls.map((call) => String(call[0]));
    const rfq = text.find((sql) => /FROM rfqs/.test(sql)) as string;
    expect(rfq).toMatch(/r\.state <> 'draft'/);
    expect(rfq).toMatch(/rfq_recipients AS rr/);
    expect(rfq).toMatch(/rv\.owner_user_id = \$1/);
    const booking = text.find((sql) => /FROM bookings/.test(sql)) as string;
    expect(booking).toMatch(/b\.state <> 'draft' AND v\.owner_user_id = \$1/);
    const contract = text.find((sql) => /FROM contracts/.test(sql)) as string;
    expect(contract).toMatch(/c\.proposer_user_id = \$1/);
  });

  it("matches user text as a pattern parameter, never inside the SQL", async () => {
    const { service, query } = harness();
    await service.search(request({ q: "x'; DROP TABLE rfqs;--" , types: ["rfq"] }), user);
    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).not.toContain("DROP TABLE");
    expect(params[1]).toContain("DROP TABLE");
  });

  it("maps private rows without the other party's identity", async () => {
    const { service, query } = harness();
    query.mockResolvedValueOnce(
      rows([
        {
          id: "b1",
          role: "customer",
          state: "confirmed",
          title: "Pipe repair",
          category_name: "Plumbing",
          hits: ["listing"],
        },
      ]),
    );
    const result = await service.search(request({ types: ["booking"] }), user);
    expect(result.sections.booking?.items).toEqual([
      {
        id: "b1",
        role: "customer",
        state: "confirmed",
        title: "Pipe repair",
        categoryName: "Plumbing",
        matchedOn: ["listing"],
      },
    ]);
  });

  it("returns no public results in a market that is not live, but still returns private ones", async () => {
    const { service, discover, query } = harness(false);
    query.mockResolvedValueOnce(
      rows([
        { id: "p1", role: "buyer", state: "created", title: "Valve", category_name: null, hits: ["item"] },
      ]),
    );
    const result = await service.search(
      request({ types: ["product", "category", "purchase_order"] }),
      user,
    );
    expect(result.marketLive).toBe(false);
    expect(result.sections.product).toEqual({ items: [], nextCursor: null });
    expect(result.sections.category).toEqual({ items: [], nextCursor: null });
    expect(result.sections.purchase_order?.items).toHaveLength(1);
    expect(discover.search).not.toHaveBeenCalled();
  });

  it("builds vendors from listing matches that hit the vendor name, once each", async () => {
    const { service } = harness();
    const result = await service.search(request({ types: ["vendor"] }), undefined);
    expect(result.sections.vendor?.items.map((v) => v.id)).toEqual(["v1"]);
  });

  it("splits product and service into separate listing searches", async () => {
    const { service, discover } = harness();
    await service.search(request({ types: ["product", "service"] }), undefined);
    const types = discover.search.mock.calls.map((call) => call[0].listingType);
    expect(types).toEqual(["product", "service"]);
  });

  it("pages a single private type and reports nextCursor", async () => {
    const { service, query } = harness();
    const many = Array.from({ length: 3 }, (_, i) => ({
      id: `r${i}`,
      role: "customer",
      state: "open",
      title: null,
      category_name: "Plumbing",
      hits: ["category"],
    }));
    query.mockResolvedValueOnce(rows(many));
    const first = await service.search(request({ types: ["rfq"], limit: 2 }), user);
    expect(first.sections.rfq?.items).toHaveLength(2);
    expect(first.sections.rfq?.nextCursor).toBe(
      Buffer.from("2").toString("base64url"),
    );
    query.mockResolvedValueOnce(rows([many[2]]));
    const second = await service.search(
      request({ types: ["rfq"], limit: 2, cursor: first.sections.rfq?.nextCursor ?? "" }),
      user,
    );
    expect(query.mock.calls[1][1][3]).toBe(2); // OFFSET
    expect(second.sections.rfq?.nextCursor).toBeNull();
  });

  it("refuses a cursor across several types, and a garbage cursor", async () => {
    const { service } = harness();
    await expect(
      service.search(request({ cursor: "Mg" }), user),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.search(request({ types: ["rfq"], cursor: "not-a-number" }), user),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("UniversalSearchQueryDto", () => {
  const parse = (plain: Record<string, unknown>) =>
    plainToInstance(UniversalSearchQueryDto, plain);

  it("splits a comma-separated types list", async () => {
    const dto = parse({ q: "pipe", countryCode: "IN", types: "product, booking" });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.types).toEqual(["product", "booking"]);
  });

  it("rejects unknown types, duplicates, short text and a bad country", async () => {
    expect(
      await validate(parse({ q: "pipe", countryCode: "IN", types: "invoice" })),
    ).not.toHaveLength(0);
    expect(
      await validate(parse({ q: "pipe", countryCode: "IN", types: "rfq,rfq" })),
    ).not.toHaveLength(0);
    expect(await validate(parse({ q: "a", countryCode: "IN" }))).not.toHaveLength(0);
    expect(await validate(parse({ q: "pipe", countryCode: "in" }))).not.toHaveLength(0);
  });
});

describe("OptionalAccessTokenGuard", () => {
  const contextWith = (headers: Record<string, string>) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ headers }) }),
    }) as unknown as ExecutionContext;

  it("lets an anonymous request through", async () => {
    const guard = new OptionalAccessTokenGuard(
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(guard.canActivate(contextWith({}))).resolves.toBe(true);
  });

  it("does not downgrade a bad token to anonymous", async () => {
    const guard = new OptionalAccessTokenGuard(
      { verifyAsync: jest.fn().mockRejectedValue(new Error("bad")) } as never,
      { getOrThrow: () => "x" } as never,
      {} as never,
    );
    await expect(
      guard.canActivate(contextWith({ authorization: "Bearer nope" })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
