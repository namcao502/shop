"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import type { PaymentMethod } from "@/lib/types";

interface PaymentSelectorProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
}

export function PaymentSelector({
  selected,
  onSelect,
}: PaymentSelectorProps) {
  const { t } = useLocale();
  const options: { value: PaymentMethod; label: string; desc: string }[] = [
    {
      value: "vietqr",
      label: t("payment.vietqr.label"),
      desc: t("payment.vietqr.desc"),
    },
    {
      value: "momo",
      label: t("payment.momo.label"),
      desc: t("payment.momo.desc"),
    },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">{t("payment.title")}</h2>
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
            selected === opt.value
              ? "border-amber-600 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20"
              : "border-gray-200 hover:bg-gray-50 dark:border-stone-600 dark:hover:bg-stone-700/50"
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value={opt.value}
            checked={selected === opt.value}
            onChange={() => onSelect(opt.value)}
            className="mt-0.5 accent-amber-600"
          />
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{opt.label}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{opt.desc}</p>
          </div>
        </label>
      ))}
    </div>
  );
}
