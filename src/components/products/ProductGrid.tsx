"use client";

import { ProductCard } from "./ProductCard";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Product } from "@/lib/types";
import type { SiteWideDiscount } from "@/lib/pricing";

interface ProductGridProps {
  products: Product[];
  siteWide?: SiteWideDiscount;
}

export function ProductGrid({ products, siteWide }: ProductGridProps) {
  const { t } = useLocale();
  if (products.length === 0) {
    return (
      <p className="py-12 text-center text-gray-500">{t("products.noFound")}</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} siteWide={siteWide} />
      ))}
    </div>
  );
}
