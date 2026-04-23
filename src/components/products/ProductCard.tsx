"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { calculateEffectivePrice, discountPercent } from "@/lib/pricing";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Product } from "@/lib/types";
import type { SiteWideDiscount } from "@/lib/pricing";

interface ProductCardProps {
  product: Product;
  siteWide?: SiteWideDiscount;
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

export function ProductCard({ product, siteWide }: ProductCardProps) {
  const { locale, t } = useLocale();
  const [imgError, setImgError] = useState(false);
  const thumbnail = product.images[0];
  const outOfStock = product.stock <= 0;
  const fmtLocale = locale === "vi" ? "vi-VN" : "en-US";

  const effectivePrice = calculateEffectivePrice(product, siteWide);
  const hasDiscount = effectivePrice < product.price;
  const pct = hasDiscount ? discountPercent(product.price, effectivePrice) : 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl dark:bg-stone-800 dark:shadow-stone-900/50"
    >
      <div className="relative overflow-hidden bg-stone-100" style={{ aspectRatio: "3/4" }}>
        {thumbnail && !imgError ? (
          <img
            src={thumbnail}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <BrokenImageIcon />
        )}
        {hasDiscount && (
          <div className="absolute left-2 top-2 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white">
            -{pct}%
          </div>
        )}
        {outOfStock ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-stone-900">
              {t("product.outOfStock")}
            </span>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-900/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="text-xs font-semibold uppercase tracking-widest text-white">
              {locale === "vi" ? "Xem chi tiet" : "View Details"} →
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display text-sm font-semibold text-stone-900 dark:text-stone-100">{product.name}</h3>
        <p className="mt-1 text-base font-bold text-amber-600">
          {formatPrice(effectivePrice, fmtLocale)}
        </p>
        {hasDiscount && (
          <p className="text-xs text-stone-400 line-through">
            {formatPrice(product.price, fmtLocale)}
          </p>
        )}
      </div>
    </Link>
  );
}
