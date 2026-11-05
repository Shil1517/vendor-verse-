import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { AvailabilityService } from "./availability.service";
import {
  CreateCapacityWindowDto,
  UpsertAvailabilityRuleDto,
} from "./dto/availability.dto";
import { CreateListingDto, UpdateListingDto } from "./dto/listing.dto";
import { ListingsService } from "./listings.service";
import { PublicationGatesService } from "./publication-gates.service";
import { parseWeeklySchedule } from "./weekly-schedule";

const user: AuthenticatedUser = { userId: "u1", sessionId: "s1" };
const result = (rows: unknown[] = [], rowCount = rows.length) => ({
  rows,
  rowCount,
});

const listingRow = (over: Record<string, unknown> = {}) => ({
  id: "l1",
  vendor_id: "v1",
  category_id: "cat1",
  subcategory_id: null,
  config_version_number: 3,
  listing_type: "service",
  title: "Electrician visit",
  description: null,
  content_state: "draft",
  price_on_request: false,
  price_min_minor: "50000",
  price_max_minor: null,
  price_currency: "INR",
  price_unit: null,
  time_zone: null,
  attributes: null,
  created_at: new Date("2026-11-05T10:00:00Z"),
  updated_at: new Date("2026-11-05T10:00:00Z"),
  ...over,
});

function harness() {
  const query = jest.fn();
  const clientQuery = jest.fn();
  const record = jest.fn().mockResolvedValue(undefined);
  const database = {
    query,
    transaction: (operation: (client: unknown) => unknown) =>
      operation({ query: clientQuery }),
  } as unknown as DatabaseService;
  const audit = { record } as unknown as AuditService;
  return { query, clientQuery, record, database, audit };
}

describe("ListingsService", () => {
  const create: CreateListingDto = Object.assign(new CreateListingDto(), {
    categoryId: "cat1",
    listingType: "service",
    title: "Electrician visit",
    priceMinMinor: 50000,
    priceCurrency: "INR",
    attributes: { licensed: true },
  });

  it("creates a draft pinned to the category's current version", async () => {
    const h = harness();
    const service = new ListingsService(h.database, h.audit);
    h.clientQuery
      .mockResolvedValueOnce(result([{}])) // vendor lock
      .mockResolvedValueOnce(result([{ current_version: 3 }])) // category
      .mockResolvedValueOnce(result([{ id: "l1" }])) // insert
      .mockResolvedValue(result()); // attributes
    h.query.mockResolvedValueOnce(result([listingRow()]));
    const view = await service.create(user, "v1", create);
    const insert = h.clientQuery.mock.calls[2];
    expect(insert[0]).toContain("INSERT INTO listings");
    expect(insert[1][3]).toBe(3);
    expect(view).toMatchObject({
      id: "l1",
      contentState: "draft",
      priceMinMinor: 50000,
      attributes: {},
    });
    expect(h.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "listing.create" }),
      expect.anything(),
    );
  });

  it("rejects an inactive category and a foreign subcategory", async () => {
    const h = harness();
    const service = new ListingsService(h.database, h.audit);
    h.clientQuery
      .mockResolvedValueOnce(result([{}]))
      .mockResolvedValueOnce(result());
    await expect(service.create(user, "v1", create)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    h.clientQuery
      .mockResolvedValueOnce(result([{}]))
      .mockResolvedValueOnce(result([{ current_version: 1 }]))
      .mockResolvedValueOnce(result());
    await expect(
      service.create(user, "v1", { ...create, subcategoryId: "other" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("404s creating under a vendor the caller does not own", async () => {
    const h = harness();
    h.clientQuery.mockResolvedValueOnce(result());
    await expect(
      new ListingsService(h.database, h.audit).create(user, "v9", create),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("maps a price check violation to 400", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(result([{}]))
      .mockResolvedValueOnce(result([{ current_version: 1 }]))
      .mockRejectedValueOnce(
        Object.assign(new Error("check"), { code: "23514" }),
      );
    await expect(
      new ListingsService(h.database, h.audit).create(user, "v1", create),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  describe("update", () => {
    const run = async (state: string, patch: UpdateListingDto) => {
      const h = harness();
      h.clientQuery
        .mockResolvedValueOnce(result([{ content_state: state }]))
        .mockResolvedValue(result());
      h.query.mockResolvedValueOnce(result([listingRow()]));
      await new ListingsService(h.database, h.audit).update(user, "l1", patch);
      return h;
    };

    it("returns an approved listing to review when it is edited", async () => {
      const h = await run("approved", { title: "New title" });
      const update = h.clientQuery.mock.calls[1];
      expect(update[1][1]).toBe("New title");
      expect(update[1][9]).toBe("pending_review");
      expect(h.record).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { fields: ["title"], returnedToReview: true },
        }),
        expect.anything(),
      );
    });

    it("keeps a draft a draft", async () => {
      const h = await run("draft", { description: "d" });
      expect(h.clientQuery.mock.calls[1][1][9]).toBe("draft");
    });

    it.each(["pending_review", "rejected", "unpublished"])(
      "refuses to edit a %s listing",
      async (state) => {
        const h = harness();
        h.clientQuery.mockResolvedValueOnce(result([{ content_state: state }]));
        await expect(
          new ListingsService(h.database, h.audit).update(user, "l1", {
            title: "x",
          }),
        ).rejects.toBeInstanceOf(ConflictException);
      },
    );
  });

  describe("transition", () => {
    const run = async (
      state: string,
      action: "submit" | "pause" | "resume" | "unpublish",
    ) => {
      const h = harness();
      h.clientQuery
        .mockResolvedValueOnce(result([{ content_state: state }]))
        .mockResolvedValue(result());
      h.query.mockResolvedValueOnce(result([listingRow()]));
      await new ListingsService(h.database, h.audit).transition(
        user,
        "l1",
        action,
      );
      return h;
    };

    it.each([
      ["draft", "submit", "pending_review"],
      ["changes_requested", "submit", "pending_review"],
      ["approved", "pause", "paused"],
      ["paused", "resume", "approved"],
      ["approved", "unpublish", "unpublished"],
    ] as const)("%s + %s -> %s", async (from, action, to) => {
      const h = await run(from, action);
      expect(h.clientQuery.mock.calls[1][1]).toEqual(["l1", to]);
    });

    it.each([
      ["pending_review", "submit"],
      ["draft", "pause"],
      ["approved", "resume"],
      ["unpublished", "unpublish"],
      ["rejected", "submit"],
    ] as const)("refuses %s + %s", async (from, action) => {
      const h = harness();
      h.clientQuery.mockResolvedValueOnce(result([{ content_state: from }]));
      await expect(
        new ListingsService(h.database, h.audit).transition(user, "l1", action),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  it("scopes reads to the owner", async () => {
    const h = harness();
    h.query.mockResolvedValueOnce(result());
    await expect(
      new ListingsService(h.database, h.audit).get(user, "other"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(h.query.mock.calls[0][1]).toEqual(["other", "u1"]);
  });
});

describe("AvailabilityService", () => {
  const rule: UpsertAvailabilityRuleDto = {
    availabilityModel: "weekly_slots",
    timeZone: "Asia/Kolkata",
    weeklySchedule: { mon: [{ start: "09:00", end: "18:00" }] },
  };

  it("stores a normalised schedule, replacing the old rule", async () => {
    const h = harness();
    const service = new AvailabilityService(h.database, h.audit);
    h.clientQuery.mockResolvedValue(result([{}]));
    h.query.mockResolvedValueOnce(result([{}])).mockResolvedValueOnce(
      result([
        {
          availability_model: "weekly_slots",
          time_zone: "Asia/Kolkata",
          weekly_schedule: {},
          valid_from: null,
          valid_to: null,
        },
      ]),
    );
    const out = await service.setRule(user, "l1", rule);
    const insert = h.clientQuery.mock.calls.find(([sql]) =>
      String(sql).includes("INSERT INTO availability_rules"),
    );
    const stored = JSON.parse(insert?.[1][3]);
    expect(Object.keys(stored)).toHaveLength(7);
    expect(stored.mon).toEqual([{ start: "09:00", end: "18:00" }]);
    expect(stored.sun).toEqual([]);
    expect(out.availabilityModel).toBe("weekly_slots");
  });

  it("rejects an invalid schedule before touching the database", async () => {
    const h = harness();
    await expect(
      new AvailabilityService(h.database, h.audit).setRule(user, "l1", {
        ...rule,
        weeklySchedule: { mon: [{ start: "18:00", end: "09:00" }] },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(h.clientQuery).not.toHaveBeenCalled();
  });

  it("returns null when the vendor provided no rule", async () => {
    const h = harness();
    h.query.mockResolvedValueOnce(result([{}])).mockResolvedValueOnce(result());
    await expect(
      new AvailabilityService(h.database, h.audit).getRule(user, "l1"),
    ).resolves.toBeNull();
  });

  it("maps an overlapping capacity window to 409 and a backwards one to 400", async () => {
    const h = harness();
    const service = new AvailabilityService(h.database, h.audit);
    await expect(
      service.addWindow(user, "l1", {
        startsAt: "2026-11-10T10:00:00Z",
        endsAt: "2026-11-10T09:00:00Z",
        capacity: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    h.clientQuery
      .mockResolvedValueOnce(result([{}]))
      .mockRejectedValueOnce(Object.assign(new Error("x"), { code: "23P01" }));
    await expect(
      service.addWindow(user, "l1", {
        startsAt: "2026-11-10T09:00:00Z",
        endsAt: "2026-11-10T10:00:00Z",
        capacity: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("will not remove a window that has reservations", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(result([{}]))
      .mockResolvedValueOnce(result([{ reserved: 1 }]));
    await expect(
      new AvailabilityService(h.database, h.audit).removeWindow(
        user,
        "l1",
        "w1",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe("parseWeeklySchedule", () => {
  it.each([
    [{ funday: [] }, "Unknown day"],
    [{ mon: "9-5" }, "list of time ranges"],
    [{ mon: [{ start: "9:00", end: "17:00" }] }, "HH:MM"],
    [{ mon: [{ start: "10:00", end: "10:00" }] }, "before end"],
    [
      {
        mon: [
          { start: "09:00", end: "12:00" },
          { start: "11:00", end: "14:00" },
        ],
      },
      "overlap",
    ],
  ])("rejects %j", (input, message) => {
    const parsed = parseWeeklySchedule(input as Record<string, unknown>);
    expect(parsed.ok).toBe(false);
    expect(!parsed.ok && parsed.error).toContain(message);
  });

  it("sorts ranges and fills every day", () => {
    const parsed = parseWeeklySchedule({
      tue: [
        { start: "14:00", end: "16:00" },
        { start: "09:00", end: "12:00" },
      ],
    });
    expect(parsed.ok && parsed.schedule.tue[0].start).toBe("09:00");
    expect(parsed.ok && Object.keys(parsed.schedule)).toHaveLength(7);
  });
});

describe("PublicationGatesService", () => {
  const facts = (over: Record<string, unknown> = {}) => ({
    account_status: "active",
    approved_count: "1",
    service_area_count: "1",
    ...over,
  });

  it("404s for a vendor the caller does not own", async () => {
    const h = harness();
    h.query.mockResolvedValueOnce(result());
    await expect(
      new PublicationGatesService(h.database).compute(user, "v9"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("never lets an unevaluated gate pass", async () => {
    const h = harness();
    h.query.mockResolvedValueOnce(result([facts()]));
    const view = await new PublicationGatesService(h.database).compute(
      user,
      "v1",
    );
    expect(view.gates.map((g) => [g.id, g.met])).toEqual([
      ["account_state", true],
      ["content_review", true],
      ["subscription", null],
      ["category_verification", null],
      ["required_fields_and_service_area", true],
      ["no_holds", null],
    ]);
    expect(view.canPublish).toBe(false);
  });

  it("fails the fields gate without a service area, and on missing required attributes", async () => {
    const h = harness();
    const service = new PublicationGatesService(h.database);
    h.query.mockResolvedValueOnce(
      result([
        facts({
          service_area_count: "0",
          account_status: "suspended",
          approved_count: "0",
        }),
      ]),
    );
    const none = await service.compute(user, "v1");
    expect(none.gates.filter((g) => g.met === false).map((g) => g.id)).toEqual([
      "account_state",
      "content_review",
      "required_fields_and_service_area",
    ]);
    h.query
      .mockResolvedValueOnce(result([facts()]))
      .mockResolvedValueOnce(
        result([{ required: ["wattage", "brand"], present: ["brand"] }]),
      );
    const missing = await service.compute(user, "v1", "l1");
    const gate = missing.gates.find(
      (g) => g.id === "required_fields_and_service_area",
    );
    expect(gate).toMatchObject({ met: false });
    expect(gate?.detail).toContain("wattage");
  });
});

describe("listing DTO validation", () => {
  const errors = async (cls: new () => object, plain: object) =>
    (await validate(plainToInstance(cls, plain))).map((e) => e.property);
  const uuid = "2e7c2d89-4d25-496d-a643-2a7d95ca9db0";

  it("requires category, type and title on create", async () => {
    expect(await errors(CreateListingDto, {})).toEqual(
      expect.arrayContaining(["categoryId", "listingType", "title"]),
    );
    expect(
      await errors(CreateListingDto, {
        categoryId: uuid,
        listingType: "service",
        title: "ok",
      }),
    ).toEqual([]);
  });

  it("rejects bad prices, currency, time zone, and nulls on edit", async () => {
    expect(
      await errors(UpdateListingDto, {
        priceMinMinor: -1,
        priceCurrency: "inr",
        timeZone: "Mars/Base",
        title: null,
      }),
    ).toEqual(
      expect.arrayContaining([
        "priceMinMinor",
        "priceCurrency",
        "timeZone",
        "title",
      ]),
    );
    expect(await errors(UpdateListingDto, {})).toEqual([]);
  });

  it("validates availability rule and capacity inputs", async () => {
    expect(
      await errors(UpsertAvailabilityRuleDto, {
        availabilityModel: "x",
        timeZone: "Asia/Kolkata",
        weeklySchedule: {},
        validFrom: "10/11/2026",
      }),
    ).toEqual(["validFrom"]);
    expect(
      await errors(CreateCapacityWindowDto, {
        startsAt: "soon",
        endsAt: "later",
        capacity: -1,
      }),
    ).toEqual(expect.arrayContaining(["startsAt", "endsAt", "capacity"]));
  });
});
