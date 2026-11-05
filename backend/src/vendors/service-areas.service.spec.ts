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
import { CreateServiceAreaDto } from "./dto/service-area.dto";
import { ServiceAreasService } from "./service-areas.service";

const user: AuthenticatedUser = { userId: "u1", sessionId: "s1" };
const result = (rows: unknown[] = [], rowCount = rows.length) => ({
  rows,
  rowCount,
});
const areaRow = (over: Record<string, unknown> = {}) => ({
  id: "a1",
  coverage_type: "city",
  country_code: "IN",
  region_id: null,
  region_name: null,
  city_id: "c1",
  city_name: "Jaipur",
  postal_code: null,
  radius_km: null,
  center_latitude: null,
  center_longitude: null,
  ...over,
});

describe("ServiceAreasService", () => {
  let query: jest.Mock;
  let clientQuery: jest.Mock;
  let record: jest.Mock;
  let service: ServiceAreasService;

  beforeEach(() => {
    query = jest.fn();
    clientQuery = jest.fn();
    record = jest.fn().mockResolvedValue(undefined);
    const database = {
      query,
      transaction: (operation: (client: unknown) => unknown) =>
        operation({ query: clientQuery }),
    } as unknown as DatabaseService;
    service = new ServiceAreasService(database, {
      record,
    } as unknown as AuditService);
  });

  it("lists areas only for an owned vendor", async () => {
    query.mockResolvedValueOnce(result());
    await expect(service.list(user, "v9")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    query
      .mockResolvedValueOnce(result([{}]))
      .mockResolvedValueOnce(result([areaRow()]));
    await expect(service.list(user, "v1")).resolves.toMatchObject([
      { id: "a1", cityName: "Jaipur", radiusKm: null },
    ]);
  });

  it("404s when adding to a vendor the caller does not own", async () => {
    clientQuery.mockResolvedValueOnce(result());
    await expect(
      service.add(user, "v9", { coverageType: "remote" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("adds a city area and audits it", async () => {
    clientQuery
      .mockResolvedValueOnce(result([{}]))
      .mockResolvedValueOnce(result([{ id: "a1" }]));
    query.mockResolvedValueOnce(result([areaRow()]));
    const view = await service.add(user, "v1", {
      coverageType: "city",
      cityId: "c1",
    });
    expect(view.id).toBe("a1");
    const values = clientQuery.mock.calls[1][1];
    expect(values.slice(0, 6)).toEqual(["v1", "city", null, null, "c1", null]);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "vendor.service_area_add" }),
      expect.anything(),
    );
  });

  it("resolves the country for a pincode area", async () => {
    clientQuery
      .mockResolvedValueOnce(result([{}]))
      .mockResolvedValueOnce(result([{ id: "country-in" }]))
      .mockResolvedValueOnce(result([{ id: "a2" }]));
    query.mockResolvedValueOnce(
      result([
        areaRow({ id: "a2", coverage_type: "pincode", postal_code: "302021" }),
      ]),
    );
    await service.add(user, "v1", {
      coverageType: "pincode",
      countryCode: "IN",
      postalCode: "302021",
    });
    expect(clientQuery.mock.calls[2][1].slice(0, 6)).toEqual([
      "v1",
      "pincode",
      "country-in",
      null,
      null,
      "302021",
    ]);
  });

  it("rejects an unknown country with 400", async () => {
    clientQuery
      .mockResolvedValueOnce(result([{}]))
      .mockResolvedValueOnce(result());
    await expect(
      service.add(user, "v1", { coverageType: "country", countryCode: "ZZ" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("reports a duplicate declaration as 409", async () => {
    clientQuery
      .mockResolvedValueOnce(result([{}]))
      .mockResolvedValueOnce(result());
    await expect(
      service.add(user, "v1", { coverageType: "remote" }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(record).not.toHaveBeenCalled();
  });

  it("maps an unknown city or region to 400", async () => {
    clientQuery
      .mockResolvedValueOnce(result([{}]))
      .mockRejectedValueOnce(Object.assign(new Error("fk"), { code: "23503" }));
    await expect(
      service.add(user, "v1", { coverageType: "city", cityId: "nope" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("removes only the caller's area and 404s otherwise", async () => {
    clientQuery.mockResolvedValueOnce(result([], 1));
    await service.remove(user, "v1", "a1");
    expect(clientQuery.mock.calls[0][1]).toEqual(["a1", "v1", "u1"]);
    clientQuery.mockResolvedValueOnce(result([], 0));
    await expect(service.remove(user, "v1", "a9")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe("CreateServiceAreaDto", () => {
  const errors = async (plain: object) =>
    (await validate(plainToInstance(CreateServiceAreaDto, plain))).map(
      (e) => e.property,
    );
  const uuid = "2e7c2d89-4d25-496d-a643-2a7d95ca9db0";

  it("rejects worldwide and unknown types", async () => {
    expect(await errors({ coverageType: "worldwide" })).toContain(
      "coverageType",
    );
  });

  it("requires the fields of the chosen type only", async () => {
    expect(await errors({ coverageType: "remote" })).toEqual([]);
    expect(await errors({ coverageType: "city" })).toEqual(["cityId"]);
    expect(await errors({ coverageType: "city", cityId: uuid })).toEqual([]);
    expect(await errors({ coverageType: "pincode" })).toEqual(
      expect.arrayContaining(["countryCode", "postalCode"]),
    );
    expect(await errors({ coverageType: "radius", radiusKm: 0 })).toEqual(
      expect.arrayContaining(["radiusKm", "latitude", "longitude"]),
    );
    expect(
      await errors({
        coverageType: "radius",
        radiusKm: 15,
        latitude: 26.9,
        longitude: 75.8,
      }),
    ).toEqual([]);
  });
});
