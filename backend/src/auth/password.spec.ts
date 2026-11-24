import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("accepts the right password and rejects a wrong one", () => {
    const stored = hashPassword("correct horse");
    expect(verifyPassword("correct horse", stored)).toBe(true);
    expect(verifyPassword("wrong horse", stored)).toBe(false);
  });

  it("salts every hash and never stores the password", () => {
    const a = hashPassword("same");
    const b = hashPassword("same");
    expect(a).not.toBe(b);
    expect(a).not.toContain("same");
  });

  it("rejects malformed stored values", () => {
    expect(verifyPassword("x", "")).toBe(false);
    expect(verifyPassword("x", "plain-text")).toBe(false);
    expect(verifyPassword("x", "scrypt$1$2")).toBe(false);
  });

  it("never matches the dummy hash used for unknown admin IDs", () => {
    expect(verifyPassword("vendor-verse@123", DUMMY_PASSWORD_HASH)).toBe(false);
  });
});
