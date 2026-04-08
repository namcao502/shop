"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import type { Category } from "@/lib/types";

interface CategoryFilterProps {
  categories: Category[];
  selected: string | null;
  onSelect: (categoryId: string | null) => void;
}

export function CategoryFilter({
  categories,
  selected,
  onSelect,
}: CategoryFilterProps) {
  const { t } = useLocale();
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          selected === null
            ? "bg-amber-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        {t("products.all")}
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            selected === cat.id
              ? "bg-amber-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
