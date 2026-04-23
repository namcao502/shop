import { describe, it, expect } from "vitest";
import { shippingAddressSchema } from "@/lib/validation";

const valid = {
  name: "Nguyen Van A",
  phone: "0901234567",
  address: "123 Nguyen Hue",
  ward: "Ben Nghe",
  province: "79",
};

describe("shippingAddressSchema phone", () => {
  it("accepts standard 10-digit Vietnamese number", () => {
    expect(shippingAddressSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts +84 international format", () => {
    const r = shippingAddressSchema.safeParse({ ...valid, phone: "+84901234567" });
    expect(r.success).toBe(true);
  });

  it("rejects 7-digit number (too short for Vietnam)", () => {
    const r = shippingAddressSchema.safeParse({ ...valid, phone: "1234567" });
    expect(r.success).toBe(false);
  });

  it("rejects letters", () => {
    const r = shippingAddressSchema.safeParse({ ...valid, phone: "090abc1234" });
    expect(r.success).toBe(false);
  });

  it("rejects number not starting with 0 or +84", () => {
    const r = shippingAddressSchema.safeParse({ ...valid, phone: "1901234567" });
    expect(r.success).toBe(false);
  });
});

describe("shippingAddressSchema other fields", () => {
  it("rejects name shorter than 2 chars", () => {
    expect(shippingAddressSchema.safeParse({ ...valid, name: "A" }).success).toBe(false);
  });

  it("rejects address shorter than 5 chars", () => {
    expect(shippingAddressSchema.safeParse({ ...valid, address: "abc" }).success).toBe(false);
  });
});
