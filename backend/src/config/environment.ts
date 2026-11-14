export type AppEnvironment = "local" | "test";

export interface AppEnvironmentConfig {
  APP_ENV: AppEnvironment;
  DATABASE_URL: string;
  DATABASE_SSL: boolean;
  CORS_ORIGINS: string[];
  JWT_ISSUER: string;
  JWT_SECRET: string;
  OTP_CHALLENGE_TTL_SECONDS: number;
  OTP_PROVIDER: "local-test";
  OTP_REQUEST_MAX: number;
  OTP_REQUEST_WINDOW_SECONDS: number;
  OTP_VERIFIER_SECRET: string;
  PORT: number;
  HOST: string;
  REFRESH_TOKEN_TTL_SECONDS: number;
  SESSION_TOKEN_PEPPER: string;
  ACCESS_TOKEN_TTL_SECONDS: number;
  OTP_VERIFY_MAX: number;
  IDEMPOTENCY_TTL_SECONDS: number;
  IDEMPOTENCY_LOCK_SECONDS: number;
  /**
   * Demo/local only. Lets SUPER_ADMIN and SALES_AGENT sign in with the OTP alone
   * (no MFA step) so the admin and agent screens can be demonstrated. Default off.
   * Safe only because auth itself refuses to run outside local/test (see below).
   */
  ALLOW_PRIVILEGED_OTP_SIGNIN: boolean;
  /**
   * File policy. All optional: with any of them unset, file uploads and
   * downloads are refused (fail closed) because the values are owner
   * decisions that are not made yet.
   */
  FILE_STORAGE_PROVIDER?: "local-test";
  FILE_MAX_BYTES?: number;
  FILE_ALLOWED_CONTENT_TYPES?: string[];
  FILE_UPLOAD_URL_TTL_SECONDS?: number;
  FILE_DOWNLOAD_URL_TTL_SECONDS?: number;
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

function requiredBoolean(
  environment: Record<string, unknown>,
  name: string,
): boolean {
  const raw = requiredString(environment, name);
  if (raw !== "true" && raw !== "false") {
    throw new Error(`${name} must be "true" or "false"`);
  }
  return raw === "true";
}

function requiredList(
  environment: Record<string, unknown>,
  name: string,
): string[] {
  const values = requiredString(environment, name)
    .split(",")
    // A browser's Origin header never ends in "/", and CORS matches it exactly,
    // so "https://app.example.com/" would silently block every request.
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter((value) => value !== "");
  if (values.length === 0) {
    throw new Error(`${name} must list at least one origin`);
  }
  return values;
}

function optionalPositiveInteger(
  environment: Record<string, unknown>,
  name: string,
): number | undefined {
  return isBlank(environment[name])
    ? undefined
    : positiveInteger(environment, name);
}

function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim() === "";
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

  const fileStorage = environment.FILE_STORAGE_PROVIDER;
  if (!isBlank(fileStorage) && String(fileStorage).trim() !== "local-test") {
    throw new Error(
      `Unsupported FILE_STORAGE_PROVIDER: ${String(fileStorage)}`,
    );
  }
  const contentTypes = isBlank(environment.FILE_ALLOWED_CONTENT_TYPES)
    ? undefined
    : requiredList(environment, "FILE_ALLOWED_CONTENT_TYPES");

  return {
    APP_ENV: appEnvironment,
    DATABASE_URL: requiredString(environment, "DATABASE_URL"),
    DATABASE_SSL: requiredBoolean(environment, "DATABASE_SSL"),
    CORS_ORIGINS: requiredList(environment, "CORS_ORIGINS"),
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
    // Loopback unless a deployment explicitly opts in to another interface.
    HOST:
      typeof environment.HOST === "string" && environment.HOST.trim() !== ""
        ? environment.HOST.trim()
        : "127.0.0.1",
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
    IDEMPOTENCY_TTL_SECONDS: positiveInteger(
      environment,
      "IDEMPOTENCY_TTL_SECONDS",
    ),
    IDEMPOTENCY_LOCK_SECONDS: positiveInteger(
      environment,
      "IDEMPOTENCY_LOCK_SECONDS",
    ),
    ALLOW_PRIVILEGED_OTP_SIGNIN:
      isBlank(environment.ALLOW_PRIVILEGED_OTP_SIGNIN)
        ? false
        : requiredBoolean(environment, "ALLOW_PRIVILEGED_OTP_SIGNIN"),
    FILE_STORAGE_PROVIDER: isBlank(fileStorage) ? undefined : "local-test",
    FILE_MAX_BYTES: optionalPositiveInteger(environment, "FILE_MAX_BYTES"),
    FILE_ALLOWED_CONTENT_TYPES: contentTypes?.map((type) => type.toLowerCase()),
    FILE_UPLOAD_URL_TTL_SECONDS: optionalPositiveInteger(
      environment,
      "FILE_UPLOAD_URL_TTL_SECONDS",
    ),
    FILE_DOWNLOAD_URL_TTL_SECONDS: optionalPositiveInteger(
      environment,
      "FILE_DOWNLOAD_URL_TTL_SECONDS",
    ),
  };
}
