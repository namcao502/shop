"use client";

import { useLocale } from "@/lib/i18n/locale-context";

export function Footer() {
  const { t } = useLocale();
  return (
    <footer className="bg-stone-900 py-10 dark:bg-stone-950">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <span className="font-display text-lg font-semibold text-white">
            {t("site.name")}
          </span>
          <p className="text-xs text-stone-500">
            &copy; {new Date().getFullYear()} {t("site.name")}. {t("footer.copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
