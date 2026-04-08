"use client";

import { formatPrice } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";

interface QRDisplayProps {
  qrUrl: string;
  orderCode: string;
  amount: number;
}

export function QRDisplay({ qrUrl, orderCode, amount }: QRDisplayProps) {
  const { locale, t } = useLocale();
  return (
    <div className="rounded-lg border bg-white p-6 text-center">
      <h3 className="text-lg font-medium text-gray-900">
        {t("qr.scanToPay")}
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        {t("qr.transferNote")} <span className="font-mono font-bold">{orderCode}</span>
      </p>
      <p className="text-sm text-gray-500">
        {t("qr.amount")} <span className="font-bold text-amber-700">{formatPrice(amount, locale === "vi" ? "vi-VN" : "en-US")}</span>
      </p>
      <div className="mx-auto mt-4 w-64">
        <img src={qrUrl} alt="Payment QR Code" className="w-full" />
      </div>
      <p className="mt-4 text-sm text-gray-500">
        {t("qr.afterPayment")}
      </p>
    </div>
  );
}
