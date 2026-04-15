import type { Product } from "@/lib/types";

export interface SiteWideDiscount {
  active: boolean;
  value: number;
}

export function calculateEffectivePrice(
  product: Pick<Product, "price" | "discountPrice">,
  siteWide?: SiteWideDiscount
): number {
  if (siteWide?.active && siteWide.value > 0) {
    return Math.floor(product.price * (1 - siteWide.value / 100));
  }
  if (product.discountPrice != null && product.discountPrice < product.price) {
    return product.discountPrice;
  }
  return product.price;
}

export function discountPercent(original: number, effective: number): number {
  return Math.round((1 - effective / original) * 100);
}
