import { BadRequestException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { GeoController } from "./geo.controller";
import { GeoService } from "./geo.service";

const result = (rows: unknown[]) => ({ rows, rowCount: rows.length });

describe("GeoService", () => {
  let query: jest.Mock;
  let service: GeoService;

  beforeEach(() => {
    query = jest.fn();
    service = new GeoService({ query } as unknown as DatabaseService);
  });

  it("marks a city live only when its own activation row is live", async () => {
    query.mockResolvedValueOnce(
      result([
        {
          id: "c1",
          name: "Jaipur",
          region_id: "r1",
          time_zone: "Asia/Kolkata",
          is_live: true,
        },
        {
          id: "c2",
          name: "Kota",
          region_id: "r1",
          time_zone: "Asia/Kolkata",
          is_live: false,
        },
      ]),
    );
    const cities = await service.listCities("IN", "r1");
    expect(cities.map((c) => [c.name, c.launchStatus])).toEqual([
      ["Jaipur", "live"],
      ["Kota", "not_live"],
    ]);
    expect(query.mock.calls[0][1]).toEqual(["IN", "r1"]);
  });

  it("passes no region filter when none is given", async () => {
    query.mockResolvedValueOnce(result([]));
    await service.listCities("IN");
    expect(query.mock.calls[0][1]).toEqual(["IN", null]);
  });

  it("maps localities", async () => {
    query.mockResolvedValueOnce(
      result([{ id: "l1", name: "Vaishali Nagar", postal_code: "302021" }]),
    );
    await expect(service.listLocalities("c1")).resolves.toEqual([
      { id: "l1", name: "Vaishali Nagar", postalCode: "302021" },
    ]);
  });

  it("requires a two-letter uppercase country code", async () => {
    const controller = new GeoController(service);
    await expect(controller.regions(undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(controller.cities("india")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(query).not.toHaveBeenCalled();
  });
});
