"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { locale, t } = useLocale();
  const thumbnail = product.images[0] ?? "/placeholder.png";
  const outOfStock = product.stock <= 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group overflow-hidden rounded-lg border bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={thumbnail}
          alt={product.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded bg-white px-3 py-1 text-sm font-medium text-gray-900">
              {t("product.outOfStock")}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-900">{product.name}</h3>
        <p className="mt-1 text-lg font-semibold text-amber-700">
          {formatPrice(product.price, locale === "vi" ? "vi-VN" : "en-US")}
        </p>
      </div>
    </Link>
  );
}
