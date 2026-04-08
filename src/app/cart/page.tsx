"use client";

import { useCart } from "@/hooks/useCart";
import { CartItem } from "@/components/cart/CartItem";
import { CartSummary } from "@/components/cart/CartSummary";
import { useLocale } from "@/lib/i18n/locale-context";
import Link from "next/link";

export default function CartPage() {
  const { t } = useLocale();
  const { items, updateQty, removeItem, totalItems, subtotal } = useCart();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t("cart.title")}</h1>

      {items.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">{t("cart.empty")}</p>
          <Link
            href="/products"
            className="mt-4 inline-block text-amber-600 hover:underline"
          >
            {t("cart.continueShopping")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {items.map((item) => (
              <CartItem
                key={item.productId}
                item={item}
                onUpdateQty={updateQty}
                onRemove={removeItem}
              />
            ))}
          </div>
          <div>
            <CartSummary subtotal={subtotal} itemCount={totalItems} />
          </div>
        </div>
      )}
    </div>
  );
}
