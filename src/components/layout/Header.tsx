"use client";

import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemePicker } from "@/components/layout/ThemePicker";
import { useState, useRef, useEffect } from "react";

export function Header() {
  const { user, loading, signIn, signOut } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const { totalItems } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-stone-100/80 theme-header-bg backdrop-blur-sm dark:border-stone-700/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-display text-xl font-bold text-stone-900 transition-colors hover:text-amber-700 dark:text-stone-100 dark:hover:text-amber-400">
            {t("site.name")}
          </Link>
          <button
            onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
            className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100 dark:bg-stone-700 dark:text-stone-200 dark:hover:bg-stone-600"
            aria-label={locale === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
          >
            {locale === "vi" ? "EN" : "VI"}
          </button>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/products" className="text-sm text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100">
            {t("nav.products")}
          </Link>
          <Link href="/cart" className="relative text-sm text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100">
            {t("nav.cart")}
            {totalItems > 0 && (
              <span className="absolute -right-4 -top-2 flex h-5 w-5 items-center justify-center rounded-full theme-accent text-xs text-white">
                {totalItems}
              </span>
            )}
          </Link>

          <ThemePicker />
          <NotificationBell />

          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded bg-stone-200" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-stone-100 active:bg-stone-200 dark:hover:bg-stone-700 dark:active:bg-stone-600"
              >
                {user.photoURL && (
                  <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full" />
                )}
                <span className="text-sm">{user.displayName}</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 w-48 rounded-lg border bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-800">
                  <Link href="/orders" className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-700" onClick={() => setMenuOpen(false)}>
                    {t("nav.myOrders")}
                  </Link>
                  {user.isAdmin && (
                    <Link href="/admin" className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-700" onClick={() => setMenuOpen(false)}>
                      {t("nav.adminPanel")}
                    </Link>
                  )}
                  <button onClick={() => { signOut(); setMenuOpen(false); }} className="block w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-700">
                    {t("nav.signOut")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button size="sm" onClick={signIn} className="shadow-md">
              {t("nav.signIn")}
            </Button>
          )}
        </nav>

        {/* Mobile right side: cart badge + notification + hamburger */}
        <div className="flex items-center gap-3 md:hidden">
          <Link href="/cart" className="relative text-stone-600 dark:text-stone-300">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.962-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full theme-accent text-xs text-white">
                {totalItems}
              </span>
            )}
          </Link>
          <ThemePicker />
          <NotificationBell />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            className="rounded-lg p-1 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 active:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-stone-100"
          >
            {mobileOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="border-t border-stone-100 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-900 md:hidden">
          <nav className="flex flex-col gap-1">
            <Link href="/products" onClick={closeMobile} className="rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-700">
              {t("nav.products")}
            </Link>
            <Link href="/cart" onClick={closeMobile} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-700">
              {t("nav.cart")}
              {totalItems > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full theme-accent text-xs text-white">
                  {totalItems}
                </span>
              )}
            </Link>

            <div className="my-1 border-t border-stone-100 dark:border-stone-700" />

            {loading ? (
              <div className="h-9 animate-pulse rounded-lg bg-stone-100" />
            ) : user ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2">
                  {user.photoURL && <img src={user.photoURL} alt="" className="h-7 w-7 rounded-full" />}
                  <span className="text-sm font-medium text-stone-900 dark:text-stone-100">{user.displayName}</span>
                </div>
                <Link href="/orders" onClick={closeMobile} className="rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-700">
                  {t("nav.myOrders")}
                </Link>
                {user.isAdmin && (
                  <Link href="/admin" onClick={closeMobile} className="rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-700">
                    {t("nav.adminPanel")}
                  </Link>
                )}
                <button
                  onClick={() => { signOut(); closeMobile(); }}
                  className="rounded-lg px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-700"
                >
                  {t("nav.signOut")}
                </button>
              </>
            ) : (
              <Button size="sm" onClick={() => { signIn(); closeMobile(); }} className="shadow-md">
                {t("nav.signIn")}
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
