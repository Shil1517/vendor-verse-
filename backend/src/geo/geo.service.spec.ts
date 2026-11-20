import { BadRequestException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { GeoController } from "./geo.controller";
import { GeoService, PincodeFetch } from "./geo.service";

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

  describe("lookupPincode", () => {
    const directory = (offices: unknown[], status = "Success") =>
      jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [{ Status: status, PostOffice: offices }],
      }) as unknown as PincodeFetch;
    const geoRows = () => {
      query
        .mockResolvedValueOnce(
          result([{ id: "r1", name: "Rajasthan", type: "state" }]),
        )
        .mockResolvedValueOnce(
          result([
            { id: "c1", name: "Jaipur", region_id: "r1", time_zone: "Asia/Kolkata", is_live: true },
            { id: "c2", name: "Ajmer", region_id: "r1", time_zone: "Asia/Kolkata", is_live: false },
          ]),
        );
    };

    it("maps a pincode to our region and city", async () => {
      service.pincodeFetch = directory([
        { Name: "Mansarovar", District: "Jaipur", State: "Rajasthan" },
        { Name: "Shipra Path", District: "Jaipur", State: "Rajasthan" },
      ]);
      geoRows();
      const view = await service.lookupPincode("IN", "302020");
      expect(view).toMatchObject({
        postalCode: "302020",
        state: "Rajasthan",
        district: "Jaipur",
        supported: true,
      });
      expect(view.city?.id).toBe("c1");
      expect(view.areas).toEqual(["Mansarovar", "Shipra Path"]);
    });

    it("reports a pincode outside our cities as unsupported, not guessed", async () => {
      service.pincodeFetch = directory([
        { Name: "Narsinghpur", District: "Narsinghpur", State: "Madhya Pradesh" },
      ]);
      geoRows();
      const view = await service.lookupPincode("IN", "487114");
      expect(view).toMatchObject({
        supported: false,
        city: null,
        region: null,
        state: "Madhya Pradesh",
      });
    });

    it("rejects malformed pincodes and other countries", async () => {
      await expect(service.lookupPincode("IN", "12345")).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(service.lookupPincode("AE", "302020")).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("404s an unknown pincode and 503s when the directory is down", async () => {
      service.pincodeFetch = directory([], "Error");
      await expect(service.lookupPincode("IN", "999999")).rejects.toThrow(
        "No such pincode",
      );
      service.pincodeFetch = jest
        .fn()
        .mockRejectedValue(new Error("down")) as unknown as PincodeFetch;
      await expect(service.lookupPincode("IN", "302021")).rejects.toThrow(
        /not reachable/,
      );
    });
  });
});
