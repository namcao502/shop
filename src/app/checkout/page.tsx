"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/lib/firebase/auth-context";
import { useCart } from "@/lib/cart-context";
import { ShippingForm } from "@/components/checkout/ShippingForm";
import { PaymentSelector } from "@/components/checkout/PaymentSelector";
import { QRDisplay } from "@/components/checkout/QRDisplay";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import type { ShippingAddress, PaymentMethod } from "@/lib/types";
import { shippingAddressSchema, parseShippingErrors } from "@/lib/validation";

export default function CheckoutPage() {
  const router = useRouter();
  const { locale, t } = useLocale();
  const { user, loading: authLoading, signIn, getIdToken } = useAuth();
  const { items, subtotal, updateQty, clear } = useCart();
  const [stockAdjusted, setStockAdjusted] = useState(false);

  const [address, setAddress] = useState<ShippingAddress>({
    name: "",
    phone: "",
    address: "",
    ward: "",
    province: "",
  });
  const [addressErrors, setAddressErrors] = useState<
    Partial<Record<keyof ShippingAddress, string>>
  >({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("vietqr");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<{
    qrUrl: string;
    orderCode: string;
    amount: number;
  } | null>(null);

  // Validate cart quantities against current stock on page load
  useEffect(() => {
    async function validateStock() {
      let anyAdjusted = false;
      for (const item of items) {
        const snap = await getDoc(doc(db, "products", item.productId));
        if (!snap.exists()) continue;
        const stock = snap.data().stock ?? 0;
        if (item.qty > stock) {
          anyAdjusted = true;
          updateQty(item.productId, Math.max(stock, 0));
        }
      }
      setStockAdjusted(anyAdjusted);
    }
    if (items.length > 0) {
      validateStock();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900">
          {t("checkout.signInRequired")}
        </h1>
        <p className="mt-2 text-gray-500">
          {t("checkout.signInMessage")}
        </p>
        <Button className="mt-4" onClick={signIn}>
          {t("nav.signIn")}
        </Button>
      </div>
    );
  }

  if (items.length === 0 && !qrData) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900">{t("checkout.cartEmpty")}</h1>
        <Button className="mt-4" onClick={() => router.push("/products")}>
          {t("checkout.browseProducts")}
        </Button>
      </div>
    );
  }

  const handleSubmit = async () => {
    const validation = shippingAddressSchema.safeParse(address);
    if (!validation.success) {
      const fieldErrors = parseShippingErrors(validation.error);
      const localized: Partial<Record<keyof ShippingAddress, string>> = {};
      if (fieldErrors.name) localized.name = t("validation.nameMin");
      if (fieldErrors.phone) localized.phone = t("validation.phoneInvalid");
      if (fieldErrors.address) localized.address = t("validation.addressMin");
      if (fieldErrors.ward) localized.ward = t("validation.wardRequired");
      if (fieldErrors.province) localized.province = t("validation.provinceRequired");
      setAddressErrors(localized);
      return;
    }
    setAddressErrors({});

    setSubmitting(true);
    setError(null);

    try {
      const token = await getIdToken();

      // 1. Create order
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
          shippingAddress: address,
          paymentMethod,
        }),
      });

      if (!orderRes.ok) {
        const data = await orderRes.json();
        throw new Error(data.error ?? "Failed to create order");
      }

      const { orderId, orderCode, totalAmount } = await orderRes.json();

      // 2. Handle payment
      if (paymentMethod === "vietqr") {
        const qrRes = await fetch("/api/vietqr", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount: totalAmount, orderCode }),
        });

        if (!qrRes.ok) throw new Error("Failed to generate QR code");

        const qr = await qrRes.json();
        setQrData({ qrUrl: qr.qrUrl, orderCode, amount: totalAmount });
        clear();
      } else {
        // MoMo
        const momoRes = await fetch("/api/momo/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orderId, orderCode, amount: totalAmount }),
        });

        if (!momoRes.ok) throw new Error("Failed to create MoMo payment");

        const { payUrl } = await momoRes.json();
        clear();
        window.location.href = payUrl;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("checkout.somethingWentWrong"));
    } finally {
      setSubmitting(false);
    }
  };

  // Show QR code after VietQR order is placed
  if (qrData) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <QRDisplay
          qrUrl={qrData.qrUrl}
          orderCode={qrData.orderCode}
          amount={qrData.amount}
        />
        <Button
          variant="secondary"
          className="mt-4 w-full"
          onClick={() => router.push("/orders")}
        >
          {t("checkout.viewMyOrders")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t("checkout.title")}</h1>

      <div className="space-y-8">
        {/* Stock warnings */}
        {stockAdjusted && (
          <p className="text-sm text-amber-600">{t("checkout.stockAdjusted")}</p>
        )}

        {/* Order summary */}
        <div className="rounded-lg border bg-gray-50 p-4">
          <h2 className="text-lg font-medium text-gray-900">{t("checkout.orderSummary")}</h2>
          {items.map((item) => (
            <div
              key={item.productId}
              className="mt-2 flex justify-between text-sm"
            >
              <span className="text-gray-600">
                {item.name} x {item.qty}
              </span>
              <span>{formatPrice(item.price * item.qty, locale === "vi" ? "vi-VN" : "en-US")}</span>
            </div>
          ))}
          <div className="mt-3 border-t pt-3 text-right text-lg font-bold text-amber-700">
            {formatPrice(subtotal, locale === "vi" ? "vi-VN" : "en-US")}
          </div>
        </div>

        <ShippingForm address={address} onChange={setAddress} errors={addressErrors} />
        <PaymentSelector selected={paymentMethod} onSelect={setPaymentMethod} />

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <Button
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? t("checkout.processing") : t("checkout.placeOrder")}
        </Button>
      </div>
    </div>
  );
}
