export type AppEnvironment = "local" | "test";

export interface AppEnvironmentConfig {
  APP_ENV: AppEnvironment;
  DATABASE_URL: string;
  JWT_ISSUER: string;
  JWT_SECRET: string;
  OTP_CHALLENGE_TTL_SECONDS: number;
  OTP_PROVIDER: "local-test";
  OTP_REQUEST_MAX: number;
  OTP_REQUEST_WINDOW_SECONDS: number;
  OTP_VERIFIER_SECRET: string;
  PORT: number;
  REFRESH_TOKEN_TTL_SECONDS: number;
  SESSION_TOKEN_PEPPER: string;
  ACCESS_TOKEN_TTL_SECONDS: number;
  OTP_VERIFY_MAX: number;
}

function requiredString(
  environment: Record<string, unknown>,
  name: string,
): string {
  const value = environment[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function positiveInteger(
  environment: Record<string, unknown>,
  name: string,
): number {
  const raw = requiredString(environment, name);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function requiredSecret(
  environment: Record<string, unknown>,
  name: string,
): string {
  const value = requiredString(environment, name);
  if (Buffer.byteLength(value, "utf8") < 32) {
    throw new Error(`${name} must contain at least 32 bytes`);
  }
  return value;
}

export function validateEnvironment(
  environment: Record<string, unknown>,
): AppEnvironmentConfig {
  const appEnvironment = requiredString(environment, "APP_ENV");
  if (appEnvironment !== "local" && appEnvironment !== "test") {
    throw new Error(
      "Authentication is disabled outside local/test until OTP delivery and MFA are implemented",
    );
  }
  if (environment.NODE_ENV === "production") {
    throw new Error(
      "Local/test authentication cannot run with NODE_ENV=production",
    );
  }

  const otpProvider = requiredString(environment, "OTP_PROVIDER");
  if (otpProvider !== "local-test") {
    throw new Error(`Unsupported OTP_PROVIDER: ${otpProvider}`);
  }

  return {
    APP_ENV: appEnvironment,
    DATABASE_URL: requiredString(environment, "DATABASE_URL"),
    JWT_ISSUER: requiredString(environment, "JWT_ISSUER"),
    JWT_SECRET: requiredSecret(environment, "JWT_SECRET"),
    OTP_CHALLENGE_TTL_SECONDS: positiveInteger(
      environment,
      "OTP_CHALLENGE_TTL_SECONDS",
    ),
    OTP_PROVIDER: otpProvider,
    OTP_REQUEST_MAX: positiveInteger(environment, "OTP_REQUEST_MAX"),
    OTP_REQUEST_WINDOW_SECONDS: positiveInteger(
      environment,
      "OTP_REQUEST_WINDOW_SECONDS",
    ),
    OTP_VERIFIER_SECRET: requiredSecret(environment, "OTP_VERIFIER_SECRET"),
    PORT: positiveInteger(environment, "PORT"),
    REFRESH_TOKEN_TTL_SECONDS: positiveInteger(
      environment,
      "REFRESH_TOKEN_TTL_SECONDS",
    ),
    SESSION_TOKEN_PEPPER: requiredSecret(environment, "SESSION_TOKEN_PEPPER"),
    ACCESS_TOKEN_TTL_SECONDS: positiveInteger(
      environment,
      "ACCESS_TOKEN_TTL_SECONDS",
    ),
    OTP_VERIFY_MAX: positiveInteger(environment, "OTP_VERIFY_MAX"),
  };
}
