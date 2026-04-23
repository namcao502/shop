"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, formatDate } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { Order } from "@/lib/types";

interface RecentOrdersTableProps {
  orders: Order[];
}

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  const { locale, t } = useLocale();
  const fmtLocale = locale === "vi" ? "vi-VN" : "en-US";

  return (
    <div className="rounded-2xl bg-white shadow-sm dark:bg-stone-800">
      <div className="border-b border-stone-100 px-4 py-3 dark:border-stone-700">
        <h3 className="font-display font-semibold text-stone-900 dark:text-stone-100">{t("admin.recentOrders")}</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-stone-500 dark:border-stone-700">
            <th className="px-4 py-2">{t("admin.colOrder")}</th>
            <th className="px-4 py-2">{t("admin.colAmount")}</th>
            <th className="px-4 py-2">{t("admin.colPayment")}</th>
            <th className="px-4 py-2">{t("admin.colStatus")}</th>
            <th className="px-4 py-2">{t("admin.colDate")}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b last:border-0 dark:border-stone-700">
              <td className="px-4 py-2">
                <Link
                  href={`/admin/orders?highlight=${order.id}`}
                  className="font-mono font-medium text-amber-700 hover:underline"
                >
                  {order.orderCode}
                </Link>
              </td>
              <td className="px-4 py-2 text-stone-700 dark:text-stone-300">{formatPrice(order.totalAmount, fmtLocale)}</td>
              <td className="px-4 py-2">
                <Badge variant={order.paymentStatus}>
                  {t(`status.${order.paymentStatus}` as TranslationKey)}
                </Badge>
              </td>
              <td className="px-4 py-2">
                <Badge variant={order.orderStatus}>
                  {t(`status.${order.orderStatus}` as TranslationKey)}
                </Badge>
              </td>
              <td className="px-4 py-2 text-stone-400">
                {formatDate(order.createdAt, fmtLocale)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
