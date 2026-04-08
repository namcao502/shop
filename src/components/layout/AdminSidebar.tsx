"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/locale-context";

export function AdminSidebar() {
  const pathname = usePathname();
  const { t } = useLocale();

  const links = [
    { href: "/admin", label: t("admin.dashboard") },
    { href: "/admin/products", label: t("admin.products") },
    { href: "/admin/orders", label: t("admin.orders") },
  ];

  return (
    <aside className="w-56 border-r bg-gray-50">
      <div className="p-4">
        <h2 className="text-sm font-bold uppercase text-gray-500">{t("admin.title")}</h2>
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
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-amber-100 text-amber-800"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 border-t px-4 pt-4">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          {t("admin.backToShop")}
        </Link>
      </div>
    </aside>
  );
}
