import { validateEnvironment } from "./environment";

const validEnvironment: Record<string, string> = {
  APP_ENV: "test",
  DATABASE_URL: "postgresql://test:test@localhost/test",
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
