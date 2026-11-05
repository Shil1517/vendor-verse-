import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  CreateLocationDto,
  UpdateLocationDto,
  UpdateProfileDto,
} from "./dto/profile.dto";

const errorsFor = async <T extends object>(
  cls: new () => T,
  body: Record<string, unknown>,
): Promise<string[]> =>
  (
    await validate(plainToInstance(cls, body), {
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  ).map((error) => error.property);

describe("UpdateProfileDto", () => {
  it("accepts a partial update and an empty body", async () => {
    await expect(errorsFor(UpdateProfileDto, {})).resolves.toEqual([]);
    await expect(
      errorsFor(UpdateProfileDto, {
        displayName: "  Aarav Mehta ",
        email: "Aarav@Example.com",
        locale: { country: "IN", language: "hi", timeZone: "Asia/Kolkata", currency: "INR" },
      }),
    ).resolves.toEqual([]);
  });

  it("trims the name and lower-cases the email", () => {
    const dto = plainToInstance(UpdateProfileDto, {
      displayName: "  Aarav Mehta ",
      email: " Aarav@Example.COM ",
    });
    expect(dto.displayName).toBe("Aarav Mehta");
    expect(dto.email).toBe("aarav@example.com");
  });

  it("rejects a one-letter or blank name and an explicit null name", async () => {
    await expect(errorsFor(UpdateProfileDto, { displayName: "A" })).resolves.toContain("displayName");
    await expect(errorsFor(UpdateProfileDto, { displayName: "   " })).resolves.toContain("displayName");
    await expect(errorsFor(UpdateProfileDto, { displayName: null })).resolves.toContain("displayName");
  });

  it("rejects a malformed email but lets null clear it", async () => {
    await expect(errorsFor(UpdateProfileDto, { email: "not-an-email" })).resolves.toContain("email");
    await expect(errorsFor(UpdateProfileDto, { email: null })).resolves.toEqual([]);
  });

  it("limits the locale to known shapes (English and Hindi at launch)", async () => {
    await expect(errorsFor(UpdateProfileDto, { locale: { language: "fr" } })).resolves.toContain("locale");
    await expect(errorsFor(UpdateProfileDto, { locale: { currency: "rupees" } })).resolves.toContain("locale");
    await expect(errorsFor(UpdateProfileDto, { locale: { country: "india" } })).resolves.toContain("locale");
    await expect(errorsFor(UpdateProfileDto, { locale: { timeZone: "Mars/Base" } })).resolves.toContain("locale");
  });

  it("rejects fields the client must not set", async () => {
    await expect(errorsFor(UpdateProfileDto, { phone: "+910000000000" })).resolves.toContain("phone");
    await expect(errorsFor(UpdateProfileDto, { emailVerified: true })).resolves.toContain("emailVerified");
    await expect(errorsFor(UpdateProfileDto, { userId: "x" })).resolves.toContain("userId");
  });
});

describe("saved location DTOs", () => {
  it("requires a label and an address", async () => {
    await expect(errorsFor(CreateLocationDto, {})).resolves.toEqual(["label", "addressText"]);
    await expect(
      errorsFor(CreateLocationDto, { label: "Home", addressText: "24 Vaishali Nagar" }),
    ).resolves.toEqual([]);
  });

  it("rejects an over-long label and a non-uuid city", async () => {
    await expect(
      errorsFor(CreateLocationDto, { label: "x".repeat(61), addressText: "a" }),
    ).resolves.toContain("label");
    await expect(
      errorsFor(CreateLocationDto, { label: "Home", addressText: "a", cityId: "jaipur" }),
    ).resolves.toContain("cityId");
  });

  it("lets an update clear the postal code and city but not the label", async () => {
    await expect(errorsFor(UpdateLocationDto, { postalCode: null, cityId: null })).resolves.toEqual([]);
    await expect(errorsFor(UpdateLocationDto, { label: null })).resolves.toContain("label");
    await expect(errorsFor(UpdateLocationDto, { isDefault: "yes" })).resolves.toContain("isDefault");
  });
});
