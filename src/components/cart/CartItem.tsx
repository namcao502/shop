"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import type { CartItem as CartItemType } from "@/lib/types";

interface CartItemProps {
  item: CartItemType;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
}

export function CartItem({ item, onUpdateQty, onRemove }: CartItemProps) {
  const { locale, t } = useLocale();
  return (
    <div className="flex items-center gap-4 border-b py-4">
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded bg-gray-100">
        <img
          src={item.image || "/placeholder.svg"}
          alt={item.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex-1">
        <Link
          href={`/products/${item.slug}`}
          className="font-medium text-gray-900 hover:underline"
        >
          {item.name}
        </Link>
        <p className="text-sm text-amber-700">{formatPrice(item.price, locale === "vi" ? "vi-VN" : "en-US")}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdateQty(item.productId, item.qty - 1)}
          className="flex h-8 w-8 items-center justify-center rounded border text-gray-600 hover:bg-gray-50"
        >
          -
        </button>
        <span className="w-8 text-center text-sm">{item.qty}</span>
        <button
          onClick={() => onUpdateQty(item.productId, item.qty + 1)}
          className="flex h-8 w-8 items-center justify-center rounded border text-gray-600 hover:bg-gray-50"
        >
          +
        </button>
      </div>
      <p className="w-28 text-right font-medium">
        {formatPrice(item.price * item.qty, locale === "vi" ? "vi-VN" : "en-US")}
      </p>
      <button
        onClick={() => onRemove(item.productId)}
        className="text-sm text-red-600 hover:underline"
      >
        {t("cart.remove")}
      </button>
    </div>
  );
}
