import { describe, it, expect } from "vitest";
import { toSlug } from "@/lib/slug";

describe("toSlug", () => {
  it("handles plain ASCII", () => {
    expect(toSlug("Hello World")).toBe("hello-world");
  });

  it("strips Vietnamese diacritics correctly", () => {
    expect(toSlug("Quà Lưu Niệm")).toBe("qua-luu-niem");
  });

  it("handles d-with-stroke", () => {
    expect(toSlug("Đồ uống")).toBe("do-uong");
  });

  it("collapses multiple separators", () => {
    expect(toSlug("hello   world")).toBe("hello-world");
  });

  it("strips leading and trailing hyphens", () => {
    expect(toSlug("-hello-")).toBe("hello");
  });
});
