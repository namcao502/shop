"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
}

function BrokenImageIcon() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-stone-100">
      <svg className="h-10 w-10 text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
        <line x1="3" y1="3" x2="21" y2="21" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function ProductCard({ product }: ProductCardProps) {
  const { locale, t } = useLocale();
  const [imgError, setImgError] = useState(false);
  const thumbnail = product.images[0];
  const outOfStock = product.stock <= 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-stone-100">
        {thumbnail && !imgError ? (
          <img
            src={thumbnail}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <BrokenImageIcon />
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded bg-white px-3 py-1 text-sm font-medium text-stone-900">
              {t("product.outOfStock")}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-sm font-medium text-stone-900">{product.name}</h3>
        <p className="mt-1 text-lg font-bold text-amber-600">
          {formatPrice(product.price, locale === "vi" ? "vi-VN" : "en-US")}
        </p>
      </div>
    </Link>
  );
}
