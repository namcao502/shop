"use client";

import { useLocale } from "@/lib/i18n/locale-context";

interface TopProduct {
  name: string;
  sold: number;
}

interface TopProductsProps {
  products: TopProduct[];
}

export function TopProducts({ products }: TopProductsProps) {
  const { t } = useLocale();
  const maxSold = Math.max(...products.map((p) => p.sold), 1);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="mb-3 font-medium text-stone-900">{t("admin.topSelling")}</h3>
      <div className="space-y-3">
        {products.map((p) => (
          <div key={p.name} className="flex items-center justify-between">
            <span className="text-sm text-stone-700">{p.name}</span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${(p.sold / maxSold) * 100}%` }}
                />
              </div>
              <span className="text-xs text-stone-400">{p.sold}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
