import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { QueryResult } from "pg";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { ProfileService } from "./profile.service";

const user: AuthenticatedUser = {
  userId: "00000000-0000-0000-0000-000000000001",
  sessionId: "00000000-0000-0000-0000-000000000002",
};
const locationId = "00000000-0000-0000-0000-0000000000aa";

const result = (rows: unknown[], rowCount = rows.length) =>
  ({ rows, rowCount, command: "", oid: 0, fields: [] }) as QueryResult;

const locationRow = (over: Record<string, unknown> = {}) => ({
  id: locationId,
  label: "Home",
  address: { text: "24 Vaishali Nagar" },
  postal_code: null,
  city_id: null,
  is_default: true,
  created_at: new Date("2026-11-05T10:00:00Z"),
  ...over,
});

describe("ProfileService", () => {
  let database: DatabaseService;
  let query: jest.SpyInstance;
  let clientQuery: jest.Mock;
  let service: ProfileService;

  beforeEach(() => {
    database = new DatabaseService("postgresql://test:test@localhost/test");
    query = jest.spyOn(database, "query");
    clientQuery = jest.fn();
    jest
      .spyOn(database, "transaction")
      .mockImplementation(async (operation) =>
        operation({ query: clientQuery } as never),
      );
    service = new ProfileService(database);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await database.onModuleDestroy();
  });

  const sqlCalls = () => clientQuery.mock.calls.map(([sql]) => String(sql));

  describe("getProfile", () => {
    it("maps the profile and reports the email as unverified until it matches a verified identifier", async () => {
      query.mockResolvedValue(
        result([
          {
            id: user.userId,
            locale: { language: "en" },
            display_name: "Aarav Mehta",
            contact_email: "aarav@example.com",
            customer_type: "individual",
            company_name: null,
            phone: "+919829000001",
            email_verified: false,
          },
        ]),
      );
      await expect(service.getProfile(user)).resolves.toEqual({
        userId: user.userId,
        displayName: "Aarav Mehta",
        phone: "+919829000001",
        email: "aarav@example.com",
        emailVerified: false,
        customerType: "individual",
        companyName: null,
        locale: { language: "en" },
      });
      expect(query.mock.calls[0][1]).toEqual([user.userId]);
    });

    it("returns an empty profile for an account that has not filled one in", async () => {
      query.mockResolvedValue(
        result([
          {
            id: user.userId,
            locale: {},
            display_name: null,
            contact_email: null,
            customer_type: null,
            company_name: null,
            phone: "+919829000001",
            email_verified: false,
          },
        ]),
      );
      await expect(service.getProfile(user)).resolves.toMatchObject({
        displayName: null,
        email: null,
        customerType: "individual",
        locale: {},
      });
    });

    it("fails closed when the account row is missing", async () => {
      query.mockResolvedValue(result([]));
      await expect(service.getProfile(user)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe("updateProfile", () => {
    beforeEach(() => {
      query.mockResolvedValue(
        result([
          {
            id: user.userId,
            locale: {},
            display_name: "Aarav Mehta",
            contact_email: null,
            customer_type: "individual",
            company_name: null,
            phone: null,
            email_verified: false,
          },
        ]),
      );
    });

    it("creates the profile on first save with only the provided fields", async () => {
      clientQuery.mockResolvedValueOnce(result([])); // no existing row
      clientQuery.mockResolvedValue(result([], 1));
      await service.updateProfile(user, {
        displayName: "Aarav Mehta",
        email: "aarav@example.com",
      });
      const upsert = clientQuery.mock.calls[1];
      expect(String(upsert[0])).toContain("INSERT INTO customer_profiles");
      expect(upsert[1]).toEqual([
        user.userId,
        "Aarav Mehta",
        "aarav@example.com",
        "individual",
        null,
      ]);
      expect(sqlCalls().some((sql) => sql.includes("UPDATE users"))).toBe(false);
    });

    it("keeps existing values for omitted fields and clears the email on null", async () => {
      clientQuery.mockResolvedValueOnce(
        result([
          {
            display_name: "Aarav Mehta",
            contact_email: "old@example.com",
            customer_type: "individual",
            company_name: null,
          },
        ]),
      );
      clientQuery.mockResolvedValue(result([], 1));
      await service.updateProfile(user, { email: null });
      expect(clientQuery.mock.calls[1][1]).toEqual([
        user.userId,
        "Aarav Mehta",
        null,
        "individual",
        null,
      ]);
    });

    it("drops the company name when the customer is an individual", async () => {
      clientQuery.mockResolvedValueOnce(
        result([
          {
            display_name: "A B",
            contact_email: null,
            customer_type: "business",
            company_name: "Acme",
          },
        ]),
      );
      clientQuery.mockResolvedValue(result([], 1));
      await service.updateProfile(user, { customerType: "individual" });
      expect(clientQuery.mock.calls[1][1]?.[4]).toBeNull();
    });

    it("merges only the provided locale keys into users.locale", async () => {
      clientQuery.mockResolvedValueOnce(result([]));
      clientQuery.mockResolvedValue(result([], 1));
      await service.updateProfile(user, {
        locale: { language: "hi", currency: "INR" },
      });
      const merge = clientQuery.mock.calls.find(([sql]) =>
        String(sql).includes("UPDATE users"),
      );
      expect(merge?.[1]).toEqual([
        user.userId,
        JSON.stringify({ language: "hi", currency: "INR" }),
      ]);
    });
  });

  describe("saved locations", () => {
    it("lists only the caller's locations, default first", async () => {
      query.mockResolvedValue(result([locationRow()]));
      await expect(service.listLocations(user)).resolves.toEqual([
        {
          id: locationId,
          label: "Home",
          addressText: "24 Vaishali Nagar",
          postalCode: null,
          cityId: null,
          isDefault: true,
          createdAt: "2026-11-05T10:00:00.000Z",
        },
      ]);
      expect(String(query.mock.calls[0][0])).toContain("ORDER BY is_default DESC");
      expect(query.mock.calls[0][1]).toEqual([user.userId]);
    });

    it("makes the first location the default", async () => {
      clientQuery
        .mockResolvedValueOnce(result([], 1)) // lock user
        .mockResolvedValueOnce(result([{ count: "0" }])) // existing
        .mockResolvedValueOnce(result([], 0)) // clear default
        .mockResolvedValueOnce(result([locationRow()]));
      const created = await service.createLocation(user, {
        label: "Home",
        addressText: "24 Vaishali Nagar",
      });
      expect(created.isDefault).toBe(true);
      const insert = clientQuery.mock.calls[3];
      expect(insert[1]?.[5]).toBe(true);
    });

    it("keeps the current default when a later location is not marked default", async () => {
      clientQuery
        .mockResolvedValueOnce(result([], 1))
        .mockResolvedValueOnce(result([{ count: "1" }]))
        .mockResolvedValueOnce(result([locationRow({ is_default: false })]));
      const created = await service.createLocation(user, {
        label: "Office",
        addressText: "MI Road",
      });
      expect(created.isDefault).toBe(false);
      expect(sqlCalls().some((sql) => sql.includes("SET is_default = false"))).toBe(false);
    });

    it("turns an unknown city into a 400, not a 500", async () => {
      clientQuery
        .mockResolvedValueOnce(result([], 1))
        .mockResolvedValueOnce(result([{ count: "0" }]))
        .mockResolvedValueOnce(result([], 0))
        .mockRejectedValueOnce(Object.assign(new Error("fk"), { code: "23503" }));
      await expect(
        service.createLocation(user, {
          label: "Home",
          addressText: "x",
          cityId: "00000000-0000-0000-0000-0000000000ff",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("reports another user's location as not found", async () => {
      clientQuery
        .mockResolvedValueOnce(result([], 1))
        .mockResolvedValueOnce(result([])); // scoped SELECT finds nothing
      await expect(
        service.updateLocation(user, locationId, { label: "Mine now" }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(clientQuery.mock.calls[1][1]).toEqual([locationId, user.userId]);
    });

    it("refuses to unset the default directly", async () => {
      clientQuery
        .mockResolvedValueOnce(result([], 1))
        .mockResolvedValueOnce(result([locationRow({ is_default: true })]));
      await expect(
        service.updateLocation(user, locationId, { isDefault: false }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("moves the default when another location is set as default", async () => {
      clientQuery
        .mockResolvedValueOnce(result([], 1))
        .mockResolvedValueOnce(result([locationRow({ is_default: false })]))
        .mockResolvedValueOnce(result([], 1)) // clear default
        .mockResolvedValueOnce(result([locationRow({ is_default: true })]));
      const updated = await service.updateLocation(user, locationId, { isDefault: true });
      expect(updated.isDefault).toBe(true);
      expect(sqlCalls().some((sql) => sql.includes("SET is_default = false"))).toBe(true);
    });

    it("promotes the oldest remaining location when the default is deleted", async () => {
      clientQuery
        .mockResolvedValueOnce(result([], 1))
        .mockResolvedValueOnce(result([{ is_default: true }], 1))
        .mockResolvedValueOnce(result([], 1));
      await service.deleteLocation(user, locationId);
      expect(sqlCalls().some((sql) => sql.includes("SET is_default = true"))).toBe(true);
    });

    it("does not promote anything when a non-default location is deleted", async () => {
      clientQuery
        .mockResolvedValueOnce(result([], 1))
        .mockResolvedValueOnce(result([{ is_default: false }], 1));
      await service.deleteLocation(user, locationId);
      expect(sqlCalls().some((sql) => sql.includes("SET is_default = true"))).toBe(false);
    });

    it("reports deleting someone else's location as not found", async () => {
      clientQuery
        .mockResolvedValueOnce(result([], 1))
        .mockResolvedValueOnce(result([], 0));
      await expect(service.deleteLocation(user, locationId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
