import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { WaitlistService } from "./waitlist.service";

const user: AuthenticatedUser = { userId: "u1", sessionId: "s1" };
const result = (rows: unknown[] = [], rowCount = rows.length) => ({
  rows,
  rowCount,
});

describe("WaitlistService", () => {
  let query: jest.Mock;
  let clientQuery: jest.Mock;
  let service: WaitlistService;

  beforeEach(() => {
    query = jest.fn();
    clientQuery = jest.fn();
    service = new WaitlistService({
      query,
      transaction: (operation: (client: unknown) => unknown) =>
        operation({ query: clientQuery }),
    } as unknown as DatabaseService);
  });

  it("joins a city that is not live", async () => {
    clientQuery
      .mockResolvedValueOnce(result([{ name: "Kota", is_live: false }]))
      .mockResolvedValueOnce(
        result([{ created_at: new Date("2026-11-05T10:00:00Z") }]),
      );
    await expect(service.join(user, "c1")).resolves.toEqual({
      cityId: "c1",
      cityName: "Kota",
      joinedAt: "2026-11-05T10:00:00.000Z",
    });
    expect(clientQuery.mock.calls[1][1]).toEqual(["c1", "u1"]);
  });

  it("refuses an unknown city, a live city and a duplicate", async () => {
    clientQuery.mockResolvedValueOnce(result());
    await expect(service.join(user, "x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    clientQuery.mockResolvedValueOnce(
      result([{ name: "Jaipur", is_live: true }]),
    );
    await expect(service.join(user, "c1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    clientQuery
      .mockResolvedValueOnce(result([{ name: "Kota", is_live: false }]))
      .mockResolvedValueOnce(result());
    await expect(service.join(user, "c2")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("leaves only the caller's own waiting entry", async () => {
    query.mockResolvedValueOnce(result([], 1));
    await expect(service.leave(user, "c1")).resolves.toBeUndefined();
    expect(query.mock.calls[0][1]).toEqual(["c1", "u1"]);
    query.mockResolvedValueOnce(result([], 0));
    await expect(service.leave(user, "c1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("lists the caller's waiting cities", async () => {
    query.mockResolvedValueOnce(
      result([
        {
          city_id: "c1",
          city_name: "Kota",
          created_at: new Date("2026-11-05T10:00:00Z"),
        },
      ]),
    );
    await expect(service.list(user)).resolves.toHaveLength(1);
    expect(query.mock.calls[0][1]).toEqual(["u1"]);
  });
});
