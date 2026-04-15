"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/locale-context";

const SIDEBAR_ICONS: Record<string, string> = {
  "/admin": "📊",
  "/admin/products": "📦",
  "/admin/orders": "🧾",
};

interface AdminSidebarProps {
  mobile?: boolean;
}

export function AdminSidebar({ mobile = false }: AdminSidebarProps) {
  const pathname = usePathname();
  const { t } = useLocale();

  const links = [
    { href: "/admin", label: t("admin.dashboard") },
    { href: "/admin/products", label: t("admin.products") },
    { href: "/admin/orders", label: t("admin.orders") },
  ];

  // Mobile: horizontal tab bar at top
  if (mobile) {
    return (
      <div className="flex items-center gap-1 border-b border-stone-100 theme-header-bg px-3 py-2 dark:border-stone-700 md:hidden">
        {links.map((link) => {
          const isActive =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "theme-active-bg theme-active-text"
                  : "text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-700/50"
              }`}
            >
              <span>{SIDEBAR_ICONS[link.href]}</span>
              {link.label}
            </Link>
          );
        })}
        <Link href="/" className="ml-auto text-xs text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300">
          ← {t("admin.backToShop")}
        </Link>
      </div>
    );
  }

  // Desktop: vertical sidebar
  return (
    <aside className="flex h-full w-56 flex-col border-r border-stone-100 theme-sidebar-bg dark:border-stone-700">
      <div className="p-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">{t("admin.title")}</h2>
      </div>
      <nav className="space-y-1 px-2">
        {links.map((link) => {
          const isActive =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-l-2 theme-accent-border theme-active-bg theme-active-text"
                  : "border-l-2 border-transparent text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-700/50"
              }`}
            >
              <span>{SIDEBAR_ICONS[link.href]}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 border-t border-stone-100/90 px-4 pt-4 dark:border-stone-700">
        <Link href="/" className="text-sm text-stone-400 transition-colors hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300">
          ← {t("admin.backToShop")}
        </Link>
      </div>
    </aside>
  );
}
