import {
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHmac } from "node:crypto";
import { DatabaseService } from "../database/database.service";
import { RateLimitService } from "../platform/rate-limit.service";
import { AuthService } from "./auth.service";

const VERIFIER_SECRET = "v".repeat(32);
const PEPPER = "p".repeat(32);

const SETTINGS: Record<string, string | number | boolean> = {
  OTP_VERIFIER_SECRET: VERIFIER_SECRET,
  SESSION_TOKEN_PEPPER: PEPPER,
  OTP_REQUEST_MAX: 2,
  OTP_REQUEST_WINDOW_SECONDS: 60,
  OTP_CHALLENGE_TTL_SECONDS: 300,
  OTP_VERIFY_MAX: 3,
  ACCESS_TOKEN_TTL_SECONDS: 900,
  REFRESH_TOKEN_TTL_SECONDS: 3600,
  JWT_ISSUER: "test",
};

const sign = (value: string, secret: string) =>
  createHmac("sha256", secret).update(value).digest("hex");

const result = (rows: unknown[] = [], rowCount = rows.length) => ({
  rows,
  rowCount,
});

describe("AuthService", () => {
  let query: jest.Mock;
  let clientQuery: jest.Mock;
  let service: AuthService;

  beforeEach(() => {
    query = jest.fn();
    clientQuery = jest.fn();
    const database = {
      query,
      transaction: (operation: (client: unknown) => unknown) =>
        operation({ query: clientQuery }),
    } as unknown as DatabaseService;
    const config = {
      get: (key: string) => SETTINGS[key],
    } as unknown as ConfigService<never, true>;
    const jwt = {
      signAsync: jest.fn().mockResolvedValue("jwt"),
    } as unknown as JwtService;
    service = new AuthService(
      database,
      config,
      jwt,
      { issue: async () => "123456" },
      new RateLimitService(database),
    );
  });

  describe("requestOtp", () => {
    it("rejects once the per-identifier limit is exceeded", async () => {
      query.mockResolvedValueOnce(result([{ request_count: 3 }]));
      await expect(
        service.requestOtp({ channel: "email", identifier: "a@b.com" }),
      ).rejects.toMatchObject({ status: 429 });
      expect(query).toHaveBeenCalledTimes(1);
    });

    it("normalizes email and stores only a hash of the code", async () => {
      query
        .mockResolvedValueOnce(result([{ request_count: 1 }]))
        .mockResolvedValue(result());
      const out = await service.requestOtp({
        channel: "email",
        identifier: " A@B.com ",
      });
      expect(out.challengeId).toBeDefined();
      const insert = query.mock.calls.find(([sql]) =>
        String(sql).includes("INSERT INTO auth_challenges"),
      );
      expect(insert?.[1][3]).toBe("a@b.com");
      expect(insert?.[1][4]).toBe(sign("123456", VERIFIER_SECRET));
    });
  });

  describe("verifyOtp", () => {
    const challenge = (over: Record<string, unknown> = {}) => ({
      id: "c1",
      user_id: "u1",
      channel: "email",
      identifier_value: "a@b.com",
      verifier_hash: sign("123456", VERIFIER_SECRET),
      expires_at: new Date(Date.now() + 60_000),
      consumed_at: null,
      failed_attempts: 0,
      ...over,
    });

    it.each([
      ["an unknown challenge", result()],
      [
        "an expired challenge",
        result([challenge({ expires_at: new Date(0) })]),
      ],
      [
        "a consumed challenge",
        result([challenge({ consumed_at: new Date() })]),
      ],
    ])("rejects %s", async (_name, row) => {
      clientQuery.mockResolvedValueOnce(row);
      await expect(
        service.verifyOtp({ challengeId: "c1", code: "123456" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("blocks verification after the attempt limit", async () => {
      clientQuery.mockResolvedValueOnce(
        result([challenge({ failed_attempts: 3 })]),
      );
      await expect(
        service.verifyOtp({ challengeId: "c1", code: "123456" }),
      ).rejects.toMatchObject({ status: 429 });
    });

    it("counts a wrong code and returns 401 below the limit", async () => {
      clientQuery
        .mockResolvedValueOnce(result([challenge()]))
        .mockResolvedValueOnce(result([{ failed_attempts: 1 }]));
      await expect(
        service.verifyOtp({ challengeId: "c1", code: "000000" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("returns 429 when a wrong code reaches the limit", async () => {
      clientQuery
        .mockResolvedValueOnce(result([challenge()]))
        .mockResolvedValueOnce(result([{ failed_attempts: 3 }]));
      await expect(
        service.verifyOtp({ challengeId: "c1", code: "000000" }),
      ).rejects.toMatchObject({ status: 429 });
    });

    it("issues no session for privileged roles", async () => {
      clientQuery
        .mockResolvedValueOnce(result([challenge()]))
        .mockResolvedValueOnce(result([{ account_status: "active" }]))
        .mockResolvedValueOnce(result())
        .mockResolvedValueOnce(result([{ role_code: "SUPER_ADMIN" }]))
        .mockResolvedValueOnce(result());
      await expect(
        service.verifyOtp({ challengeId: "c1", code: "123456" }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      const sessions = clientQuery.mock.calls.filter(([sql]) =>
        String(sql).includes("INSERT INTO auth_sessions"),
      );
      expect(sessions).toHaveLength(0);
    });

    it("lets a privileged role in with the OTP alone only when the demo flag is on", async () => {
      SETTINGS.ALLOW_PRIVILEGED_OTP_SIGNIN = true;
      try {
        clientQuery
          .mockResolvedValueOnce(result([challenge()]))
          .mockResolvedValueOnce(result([{ account_status: "active" }]))
          .mockResolvedValueOnce(result())
          .mockResolvedValueOnce(result([{ role_code: "SALES_AGENT" }]))
          .mockResolvedValue(result());
        const credentials = await service.verifyOtp({
          challengeId: "c1",
          code: "123456",
        });
        expect(credentials.accessToken).toBe("jwt");
      } finally {
        delete SETTINGS.ALLOW_PRIVILEGED_OTP_SIGNIN;
      }
    });

    it("creates a session for a valid customer code", async () => {
      clientQuery
        .mockResolvedValueOnce(result([challenge()]))
        .mockResolvedValueOnce(result([{ account_status: "active" }]))
        .mockResolvedValueOnce(result())
        .mockResolvedValueOnce(result([{ role_code: "CUSTOMER" }]))
        .mockResolvedValue(result());
      const credentials = await service.verifyOtp({
        challengeId: "c1",
        code: "123456",
      });
      expect(credentials.accessToken).toBe("jwt");
      expect(credentials.refreshToken).toBeTruthy();
    });
  });

  describe("refresh", () => {
    const session = (over: Record<string, unknown> = {}) => ({
      id: "s1",
      user_id: "u1",
      expires_at: new Date(Date.now() + 60_000),
      account_status: "active",
      ...over,
    });

    it.each([
      ["an unknown token", result()],
      ["an expired session", result([session({ expires_at: new Date(0) })])],
      [
        "a suspended account",
        result([session({ account_status: "suspended" })]),
      ],
    ])("rejects %s", async (_name, row) => {
      clientQuery.mockResolvedValueOnce(row);
      await expect(service.refresh("tok")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("rotates the refresh token hash", async () => {
      clientQuery
        .mockResolvedValueOnce(result([session()]))
        .mockResolvedValueOnce(result());
      const credentials = await service.refresh("old");
      expect(clientQuery.mock.calls[1][1][0]).toBe(
        sign(credentials.refreshToken, PEPPER),
      );
      expect(credentials.refreshToken).not.toBe("old");
    });
  });

  describe("logout", () => {
    const user = { userId: "u1", sessionId: "s1" };

    it("revokes the session matching the refresh token", async () => {
      query.mockResolvedValueOnce(result([{ id: "s1" }], 1));
      await expect(service.logout(user, "tok")).resolves.toBeUndefined();
    });

    it("rejects a refresh token that does not match", async () => {
      query.mockResolvedValueOnce(result([], 0));
      await expect(service.logout(user, "bad")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
