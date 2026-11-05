import { validateEnvironment } from "./environment";

const validEnvironment: Record<string, string> = {
  APP_ENV: "test",
  DATABASE_URL: "postgresql://test:test@localhost/test",
  DATABASE_SSL: "false",
  CORS_ORIGINS: "http://localhost:5173, http://localhost:5174",
  JWT_ISSUER: "test-issuer",
  JWT_SECRET: "test-only-jwt-secret-value-with-32-bytes",
  OTP_CHALLENGE_TTL_SECONDS: "10",
  OTP_PROVIDER: "local-test",
  OTP_REQUEST_MAX: "2",
  OTP_REQUEST_WINDOW_SECONDS: "30",
  OTP_VERIFIER_SECRET: "test-only-otp-verifier-secret-value",
  PORT: "3000",
  REFRESH_TOKEN_TTL_SECONDS: "60",
  SESSION_TOKEN_PEPPER: "test-only-session-token-pepper-value",
  ACCESS_TOKEN_TTL_SECONDS: "10",
  OTP_VERIFY_MAX: "3",
  IDEMPOTENCY_TTL_SECONDS: "60",
  IDEMPOTENCY_LOCK_SECONDS: "10",
};

describe("validateEnvironment", () => {
  it("accepts explicit test configuration", () => {
    expect(validateEnvironment(validEnvironment)).toMatchObject({
      APP_ENV: "test",
      OTP_PROVIDER: "local-test",
      OTP_REQUEST_MAX: 2,
      OTP_VERIFY_MAX: 3,
    });
  });

  it("requires every policy value instead of applying defaults", () => {
    const environment = { ...validEnvironment };
    delete environment.OTP_REQUEST_MAX;

    expect(() => validateEnvironment(environment)).toThrow(
      "Missing required environment variable: OTP_REQUEST_MAX",
    );
  });

  it("binds to loopback unless HOST is set", () => {
    expect(validateEnvironment(validEnvironment).HOST).toBe("127.0.0.1");
    expect(
      validateEnvironment({ ...validEnvironment, HOST: " 0.0.0.0 " }).HOST,
    ).toBe("0.0.0.0");
  });

  it("parses CORS_ORIGINS into a trimmed list", () => {
    expect(validateEnvironment(validEnvironment).CORS_ORIGINS).toEqual([
      "http://localhost:5173",
      "http://localhost:5174",
    ]);
  });

  it("rejects an empty CORS_ORIGINS list", () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, CORS_ORIGINS: " , " }),
    ).toThrow("CORS_ORIGINS must list at least one origin");
  });

  it("rejects a non-boolean DATABASE_SSL value", () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, DATABASE_SSL: "yes" }),
    ).toThrow('DATABASE_SSL must be "true" or "false"');
  });

  it("refuses fixed OTP outside local and test environments", () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, APP_ENV: "production" }),
    ).toThrow("Authentication is disabled outside local/test");
  });

  it("refuses production node mode even when local auth is selected", () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        NODE_ENV: "production",
      }),
    ).toThrow("Local/test authentication cannot run with NODE_ENV=production");
  });

  it("rejects invalid and missing numeric values", () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        OTP_VERIFY_MAX: "0",
      }),
    ).toThrow("OTP_VERIFY_MAX must be a positive integer");
  });

  it("requires cryptographic secrets of at least 32 bytes", () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        JWT_SECRET: "too-short",
      }),
    ).toThrow("JWT_SECRET must contain at least 32 bytes");
  });
});
