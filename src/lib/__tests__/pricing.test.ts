import { describe, it, expect } from "vitest";
import { calculateEffectivePrice, discountPercent } from "@/lib/pricing";

describe("calculateEffectivePrice", () => {
  const product = { price: 100_000, discountPrice: undefined };

  it("returns price when no discount", () => {
    expect(calculateEffectivePrice(product)).toBe(100_000);
  });

  it("returns discountPrice when lower than price and no site-wide", () => {
    expect(
      calculateEffectivePrice({ price: 100_000, discountPrice: 80_000 })
    ).toBe(80_000);
  });

  it("ignores discountPrice when site-wide discount is active", () => {
    expect(
      calculateEffectivePrice(
        { price: 100_000, discountPrice: 80_000 },
        { active: true, value: 10 }
      )
    ).toBe(90_000);
  });

  it("ignores site-wide discount when not active", () => {
    expect(
      calculateEffectivePrice({ price: 100_000 }, { active: false, value: 20 })
    ).toBe(100_000);
  });

  it("floors fractional results", () => {
    expect(
      calculateEffectivePrice({ price: 99_999 }, { active: true, value: 10 })
    ).toBe(89_999);
  });

  it("ignores discountPrice >= price", () => {
    expect(
      calculateEffectivePrice({ price: 100_000, discountPrice: 100_000 })
    ).toBe(100_000);
  });
});

describe("discountPercent", () => {
  it("calculates percent off correctly", () => {
    expect(discountPercent(100_000, 80_000)).toBe(20);
  });

  it("rounds to nearest integer", () => {
    expect(discountPercent(100_000, 66_667)).toBe(33);
  });
});
