"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { OrderStatus } from "@/lib/types";

interface StatusBreakdownProps {
  counts: Record<OrderStatus, number>;
}

const colors: Record<OrderStatus, string> = {
  pending: "text-amber-600",
  confirmed: "text-blue-600",
  shipping: "text-purple-600",
  delivered: "text-green-600",
  cancelled: "text-stone-400",
};

const statusKeys: OrderStatus[] = ["pending", "confirmed", "shipping", "delivered", "cancelled"];

export function StatusBreakdown({ counts }: StatusBreakdownProps) {
  const { t } = useLocale();

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="mb-3 font-medium text-stone-900">{t("admin.orderStatus")}</h3>
      <div className="flex flex-wrap gap-3">
        {statusKeys.map((status) => (
          <div key={status} className="rounded-lg border border-stone-100 px-3 py-2 text-sm">
            <span className="text-stone-500">
              {t(`status.${status}` as TranslationKey)}{" "}
            </span>
            <span className={`font-bold ${colors[status]}`}>
              {counts[status] ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
