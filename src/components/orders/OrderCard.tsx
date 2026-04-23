"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, formatDate } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { Order } from "@/lib/types";

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  const { locale, t } = useLocale();
  const fmtLocale = locale === "vi" ? "vi-VN" : "en-US";
  const itemCount = order.items.length;

  return (
    <Link
      href={`/orders/${order.id}`}
      className="block rounded-2xl bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-stone-800"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-bold text-stone-900 dark:text-stone-100">
          {order.orderCode}
        </span>
        <span className="text-sm text-stone-500 dark:text-stone-400">
          {formatDate(order.createdAt, fmtLocale)}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-2">
          <Badge variant={order.paymentStatus}>{t(`status.${order.paymentStatus}` as TranslationKey)}</Badge>
          <Badge variant={order.orderStatus}>{t(`status.${order.orderStatus}` as TranslationKey)}</Badge>
        </div>
        <span className="font-medium text-amber-700">
          {formatPrice(order.totalAmount, fmtLocale)}
        </span>
      </div>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
        {itemCount} {itemCount === 1 ? t("orders.item") : t("orders.items")}
      </p>
    </Link>
  );
}
