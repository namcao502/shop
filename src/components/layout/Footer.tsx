"use client";

import { useLocale } from "@/lib/i18n/locale-context";

export function Footer() {
  const { t } = useLocale();
  return (
    <footer className="border-t theme-footer-bg py-8">
      <div className="mx-auto max-w-7xl px-4 text-center text-sm text-stone-500">
        <p>&copy; {new Date().getFullYear()} {t("site.name")}. {t("footer.copyright")}</p>
      </div>
    </footer>
  );
}
