"use client";

import { formatPrice } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface CartSummaryProps {
  subtotal: number;
  itemCount: number;
}

export function CartSummary({ subtotal, itemCount }: CartSummaryProps) {
  const { locale, t } = useLocale();
  const fmtLocale = locale === "vi" ? "vi-VN" : "en-US";

  return (
    <div className="rounded-lg border bg-gray-50 p-6">
      <h2 className="text-lg font-medium text-gray-900">{t("cart.orderSummary")}</h2>
      <div className="mt-4 flex justify-between text-sm">
        <span className="text-gray-600">
          {t("cart.subtotal")} ({itemCount} {itemCount === 1 ? t("orders.item") : t("orders.items")})
        </span>
        <span className="font-medium">{formatPrice(subtotal, fmtLocale)}</span>
      </div>
      <div className="mt-4 border-t pt-4">
        <div className="flex justify-between text-base font-medium">
          <span>{t("cart.total")}</span>
          <span className="text-amber-700">{formatPrice(subtotal, fmtLocale)}</span>
        </div>
      </div>
      <Link href="/checkout">
        <Button className="mt-4 w-full" size="lg" disabled={itemCount === 0}>
          {t("cart.proceedToCheckout")}
        </Button>
      </Link>
    </div>
  );
}
