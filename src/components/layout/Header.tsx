"use client";

import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

export function Header() {
  const { user, loading, signIn, signOut } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const { totalItems } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xl font-bold text-amber-700">
            {t("site.name")}
          </Link>
          <button
            onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
            className="rounded border px-2 py-1 text-xs font-bold text-gray-600 hover:bg-gray-50"
          >
            {locale === "vi" ? "EN" : "VI"}
          </button>
        </div>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/products" className="text-sm text-gray-600 hover:text-gray-900">
            {t("nav.products")}
          </Link>
          <Link href="/cart" className="relative text-sm text-gray-600 hover:text-gray-900">
            {t("nav.cart")}
            {totalItems > 0 && (
              <span className="absolute -right-4 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-xs text-white">
                {totalItems}
              </span>
            )}
          </Link>

          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2"
              >
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <span className="text-sm">{user.displayName}</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 w-48 rounded-lg border bg-white py-1 shadow-lg">
                  <Link
                    href="/orders"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("nav.myOrders")}
                  </Link>
                  {user.isAdmin && (
                    <Link
                      href="/admin"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      {t("nav.adminPanel")}
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      signOut();
                      setMenuOpen(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {t("nav.signOut")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button size="sm" onClick={signIn}>
              {t("nav.signIn")}
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
