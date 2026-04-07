"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/lib/firebase/auth-context";
import { useCart } from "@/hooks/useCart";
import { ShippingForm } from "@/components/checkout/ShippingForm";
import { PaymentSelector } from "@/components/checkout/PaymentSelector";
import { QRDisplay } from "@/components/checkout/QRDisplay";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/format";
import type { ShippingAddress, PaymentMethod } from "@/lib/types";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading, signIn, getIdToken } = useAuth();
  const { items, subtotal, updateQty, clear } = useCart();
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);

  const [address, setAddress] = useState<ShippingAddress>({
    name: "",
    phone: "",
    address: "",
    district: "",
    city: "",
    province: "",
  });
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
      const warnings: string[] = [];
      for (const item of items) {
        const snap = await getDoc(doc(db, "products", item.productId));
        if (!snap.exists()) continue;
        const stock = snap.data().stock ?? 0;
        if (item.qty > stock) {
          const adjusted = Math.max(stock, 0);
          if (adjusted === 0) {
            warnings.push(`${item.name} is out of stock and was removed.`);
          } else {
            warnings.push(
              `${item.name} quantity adjusted from ${item.qty} to ${adjusted} (only ${stock} in stock).`
            );
          }
          updateQty(item.productId, adjusted);
        }
      }
      setStockWarnings(warnings);
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
          Sign in to continue
        </h1>
        <p className="mt-2 text-gray-500">
          You need to sign in with Google to place an order.
        </p>
        <Button className="mt-4" onClick={signIn}>
          Sign In with Google
        </Button>
      </div>
    );
  }

  if (items.length === 0 && !qrData) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900">Cart is empty</h1>
        <Button className="mt-4" onClick={() => router.push("/products")}>
          Browse Products
        </Button>
      </div>
    );
  }

  const isAddressComplete = Object.values(address).every((v) => v.trim() !== "");

  const handleSubmit = async () => {
    if (!isAddressComplete) {
      setError("Please fill in all address fields.");
      return;
    }

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
      setError(err instanceof Error ? err.message : "Something went wrong");
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
          View My Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Checkout</h1>

      <div className="space-y-8">
        {/* Stock warnings */}
        {stockWarnings.length > 0 && (
          <div className="rounded-lg bg-yellow-50 p-4">
            <p className="text-sm font-medium text-yellow-800">Stock adjusted:</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-yellow-700">
              {stockWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Order summary */}
        <div className="rounded-lg border bg-gray-50 p-4">
          <h2 className="text-lg font-medium text-gray-900">Order Summary</h2>
          {items.map((item) => (
            <div
              key={item.productId}
              className="mt-2 flex justify-between text-sm"
            >
              <span className="text-gray-600">
                {item.name} x {item.qty}
              </span>
              <span>{formatPrice(item.price * item.qty)}</span>
            </div>
          ))}
          <div className="mt-3 border-t pt-3 text-right text-lg font-bold text-amber-700">
            {formatPrice(subtotal)}
          </div>
        </div>

        <ShippingForm address={address} onChange={setAddress} />
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
          {submitting ? "Processing..." : "Place Order"}
        </Button>
      </div>
    </div>
  );
}
