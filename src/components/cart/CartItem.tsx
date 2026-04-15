"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import { useToast } from "@/lib/toast-context";
import type { CartItem as CartItemType } from "@/lib/types";

interface CartItemProps {
  item: CartItemType;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
}

export function CartItem({ item, onUpdateQty, onRemove }: CartItemProps) {
  const { locale, t } = useLocale();
  const { toast } = useToast();
  const fmtLocale = locale === "vi" ? "vi-VN" : "en-US";
  return (
    <div className="border-b py-4 dark:border-stone-700">
      <div className="flex gap-3">
        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded bg-gray-100 dark:bg-stone-700">
          <img
            src={item.image || "/placeholder.svg"}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex flex-1 flex-col justify-between">
          <div>
            <Link
              href={`/products/${item.slug}`}
              className="font-medium text-gray-900 hover:underline dark:text-gray-100"
            >
              {item.name}
            </Link>
            <p className="text-sm text-amber-700">{formatPrice(item.price, fmtLocale)}</p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateQty(item.productId, item.qty - 1)}
                className="flex h-8 w-8 items-center justify-center rounded border text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
              >
                -
              </button>
              <span className="w-8 text-center text-sm">{item.qty}</span>
              <button
                onClick={() => onUpdateQty(item.productId, item.qty + 1)}
                className="flex h-8 w-8 items-center justify-center rounded border text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
              >
                +
              </button>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-medium">{formatPrice(item.price * item.qty, fmtLocale)}</p>
              <button
                onClick={() => { onRemove(item.productId); toast(t("toast.removedFromCart"), "info"); }}
                className="text-sm text-red-600 hover:underline"
              >
                {t("cart.remove")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
