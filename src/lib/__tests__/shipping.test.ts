import { describe, it, expect } from "vitest";
import { calculateShippingFee } from "@/lib/shipping";

describe("calculateShippingFee", () => {
  it("returns 0 when subtotal >= 500,000", () => {
    expect(calculateShippingFee("79", 500_000)).toBe(0);
    expect(calculateShippingFee("48", 1_000_000)).toBe(0);
  });

  it("returns 20,000 for HCM (79)", () => {
    expect(calculateShippingFee("79", 100_000)).toBe(20_000);
  });

  it("returns 20,000 for Hanoi (01)", () => {
    expect(calculateShippingFee("01", 100_000)).toBe(20_000);
  });

  it("returns 35,000 for other provinces", () => {
    expect(calculateShippingFee("48", 100_000)).toBe(35_000);
    expect(calculateShippingFee("92", 0)).toBe(35_000);
  });

  it("returns 0 for HCM when subtotal is exactly at threshold", () => {
    expect(calculateShippingFee("79", 499_999)).toBe(20_000);
    expect(calculateShippingFee("79", 500_000)).toBe(0);
  });
});
