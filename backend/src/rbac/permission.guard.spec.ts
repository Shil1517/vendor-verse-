import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DatabaseService } from "../database/database.service";
import { PermissionGuard } from "./permission.guard";

const contextFor = (user?: { userId: string }) =>
  ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({ authenticatedUser: user }),
    }),
  }) as unknown as ExecutionContext;

describe("PermissionGuard", () => {
  const build = (permission: string | undefined, rowCount: number) => {
    const query = jest.fn().mockResolvedValue({ rows: [], rowCount });
    const reflector = {
      getAllAndOverride: () => permission,
    } as unknown as Reflector;
    const guard = new PermissionGuard(reflector, {
      query,
    } as unknown as DatabaseService);
    return { guard, query };
  };

  it("allows a user whose active role holds the permission", async () => {
    const { guard, query } = build("rbac.read", 1);
    await expect(guard.canActivate(contextFor({ userId: "u1" }))).resolves.toBe(
      true,
    );
    expect(query.mock.calls[0][1]).toEqual(["u1", "rbac.read"]);
    expect(query.mock.calls[0][0]).toContain("revoked_at IS NULL");
  });

  it("denies a user without the permission", async () => {
    const { guard } = build("rbac.manage", 0);
    await expect(
      guard.canActivate(contextFor({ userId: "u1" })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("denies by default when the route names no permission", async () => {
    const { guard, query } = build(undefined, 1);
    await expect(
      guard.canActivate(contextFor({ userId: "u1" })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(query).not.toHaveBeenCalled();
  });

  it("denies when there is no signed-in user", async () => {
    const { guard } = build("rbac.read", 1);
    await expect(guard.canActivate(contextFor())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
