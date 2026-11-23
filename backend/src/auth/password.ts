import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Salted scrypt. Format: scrypt$N$r$p$saltB64$hashB64. scripts/seed-admin.cjs writes the same format.
const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

/** Constant-time check. Returns false for any malformed stored value. */
export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = scryptSync(password, Buffer.from(salt, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Hash of a throwaway password, verified against when the admin ID is unknown so timing does not reveal it. */
export const DUMMY_PASSWORD_HASH = hashPassword(randomBytes(16).toString("hex"));
