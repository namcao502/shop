"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui/Button";
import type { SiteWideDiscount } from "@/lib/pricing";

export default function AdminSettingsPage() {
  const { getIdToken } = useAuth();
  const { t } = useLocale();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SiteWideDiscount>({ active: false, value: 0 });
  const [inputValue, setInputValue] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const token = await getIdToken();
      const res = await fetch("/api/settings/discount", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: SiteWideDiscount = await res.json();
        setSettings(data);
        setInputValue(data.value.toString());
      }
      setLoading(false);
    }
    load();
  }, [getIdToken]);

  const handleSave = async (patch: Partial<SiteWideDiscount>) => {
    setSaving(true);
    const next = { ...settings, ...patch };
    const token = await getIdToken();
    const res = await fetch("/api/settings/discount", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(next),
    });
    if (res.ok) {
      const data: SiteWideDiscount = await res.json();
      setSettings(data);
      setInputValue(data.value.toString());
      toast(t("toast.productUpdated"), "success");
    } else {
      const json = await res.json().catch(() => ({}));
      toast(json.error ?? t("toast.somethingWentWrong"), "error");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 rounded bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t("admin.settings")}</h1>

      <div className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{t("admin.siteWideSale")}</h2>
            <p className="text-sm text-gray-500">{t("admin.siteWideSaleDesc")}</p>
          </div>
          <button
            type="button"
            onClick={() => handleSave({ active: !settings.active })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.active ? "bg-amber-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.active ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={99}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <span className="text-sm text-gray-500">{t("admin.percentOffAll")}</span>
          <Button
            size="sm"
            disabled={saving}
            onClick={() => {
              const val = parseInt(inputValue, 10);
              if (!isNaN(val) && val >= 1 && val <= 99) {
                handleSave({ value: val });
              }
            }}
          >
            {saving ? t("form.saving") : t("form.update")}
          </Button>
        </div>

        {settings.active && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
            {t("admin.siteWideSaleActive").replace("{value}", settings.value.toString())}
          </p>
        )}
      </div>
    </div>
  );
}
