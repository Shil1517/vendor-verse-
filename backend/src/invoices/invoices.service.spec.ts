import { NotFoundException } from "@nestjs/common";
import { InvoicesService } from "./invoices.service";

const user = { userId: "owner" } as never;

describe("InvoicesService", () => {
  it("does not query invoices until vendor ownership is established", async () => {
    const query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] });
    const service = new InvoicesService({ query } as never);
    await expect(service.listOwn(user, "another-vendor")).rejects.toBeInstanceOf(NotFoundException);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1]).toEqual(["another-vendor", "owner"]);
  });

  it("scopes invoice detail to the owned vendor", async () => {
    const query = jest.fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ one: 1 }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const service = new InvoicesService({ query } as never);
    await expect(service.getOwn(user, "vendor", "other-invoice")).rejects.toBeInstanceOf(NotFoundException);
    expect(query.mock.calls[1][1]).toEqual(["other-invoice", "vendor"]);
  });
});
