// src/components/layout/NotificationBell.tsx
"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/lib/firebase/auth-context";
import { useLocale } from "@/lib/i18n/locale-context";
import type { NotificationType } from "@/lib/types";
import type { TranslationKey } from "@/lib/i18n/translations";

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function notificationText(
  type: NotificationType,
  orderCode: string | null,
  t: (key: TranslationKey) => string
): { title: string; message: string } {
  const titleKey = `notification.${type}.title` as TranslationKey;
  const messageKey = `notification.${type}.message` as TranslationKey;
  const code = orderCode ?? "";
  return {
    title: t(titleKey).replace("{orderCode}", code),
    message: t(messageKey),
  };
}

export function NotificationBell() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { notifications, unreadCount, markAllRead, markOneRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popup on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  if (!user) return null;

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-full p-1 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 active:bg-stone-200"
        aria-label="Notifications"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popup */}
      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border border-stone-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <span className="text-sm font-bold text-stone-900">{t("notification.title")}</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-semibold theme-accent-text hover:opacity-80"
              >
                {t("notification.markAllRead")}
              </button>
            )}
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-stone-400">
              {t("notification.empty")}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-stone-100 px-4 py-3 last:border-0 ${
                    !n.read
                      ? "border-l-2 theme-accent-border bg-stone-50"
                      : "opacity-70"
                  }`}
                >
                  {(() => {
                    const { title, message } = notificationText(n.type, n.orderCode, t);
                    return (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-stone-900">{title}</span>
                          <span className="shrink-0 text-xs text-stone-400">
                            {formatRelative(n.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-stone-600">{message}</p>
                      </>
                    );
                  })()}
                  {n.orderId && (
                    <Link
                      href={`/orders?highlight=${n.orderId}`}
                      onClick={() => {
                        markOneRead(n.id);
                        setOpen(false);
                      }}
                      className="mt-1 block text-xs font-semibold theme-accent-text hover:opacity-80"
                    >
                      {t("notification.viewOrder")} &rarr;
                    </Link>
                  )}
                  {!n.read && !n.orderId && (
                    <button
                      onClick={() => markOneRead(n.id)}
                      className="mt-1 text-xs text-stone-400 hover:text-stone-600"
                    >
                      {t("notification.markAsRead")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
