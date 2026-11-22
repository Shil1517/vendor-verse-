import { BadRequestException, NotFoundException } from "@nestjs/common";
import { SponsoredService } from "./sponsored.service";

const user = { userId: "owner" } as never;

describe("SponsoredService", () => {
  it("does not list campaigns without vendor ownership", async () => {
    const query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] });
    const service = new SponsoredService({ query } as never, {} as never);
    await expect(service.listOwn(user, "other-vendor")).rejects.toBeInstanceOf(NotFoundException);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("requires a listing to belong to the owned vendor", async () => {
    const query = jest.fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ one: 1 }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const service = new SponsoredService({ query } as never, {} as never);
    await expect(service.create(user, "vendor", { listingId: "listing", placement: "home" }))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(query.mock.calls[1][1]).toEqual(["listing", "vendor"]);
  });

  it("does not offer activation through vendor or admin status APIs", async () => {
    const query = jest.fn().mockResolvedValue({ rowCount: 1, rows: [{ one: 1 }] });
    const service = new SponsoredService({ query } as never, {} as never);
    await expect(service.vendorStatus(user, "vendor", "campaign", { status: "active" as never, reason: "x" }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.adminStatus(user, "campaign", { status: "active" as never, reason: "x" }))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
