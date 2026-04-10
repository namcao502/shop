"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/lib/firebase/auth-context";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { ShippingForm } from "@/components/checkout/ShippingForm";
import { QRDisplay } from "@/components/checkout/QRDisplay";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, formatDate } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import { useConfirm } from "@/lib/confirm-context";
import { useToast } from "@/lib/toast-context";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { Order, ShippingAddress } from "@/lib/types";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { locale, t } = useLocale();
  const { getIdToken } = useAuth();
  const confirm = useConfirm();
  const { toast } = useToast();
  const fmtLocale = locale === "vi" ? "vi-VN" : "en-US";

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [draftAddress, setDraftAddress] = useState<ShippingAddress | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    const orderId = params.id as string;
    const unsubscribe = onSnapshot(doc(db, "orders", orderId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setOrder({
          id: snap.id,
          ...data,
          createdAt: data.createdAt?.toDate() ?? new Date(),
          updatedAt: data.updatedAt?.toDate() ?? new Date(),
        } as Order);
      }
      setLoading(false);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function authHeader(): Promise<string> {
    const token = await getIdToken();
    if (!token) throw new Error("Not authenticated");
    return `Bearer ${token}`;
  }

  async function handleCancel() {
    if (!order) return;
    if (!await confirm({ title: t("order.cancelTitle"), description: t("order.cancelConfirm") })) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: await authHeader(),
        },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error ?? t("toast.somethingWentWrong"), "error");
      } else {
        toast(t("order.cancelSuccess"), "success");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAddress() {
    if (!order || !draftAddress) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: await authHeader(),
        },
        body: JSON.stringify({ action: "update_address", shippingAddress: draftAddress }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error ?? t("toast.somethingWentWrong"), "error");
      } else {
        setAddressFormOpen(false);
        setDraftAddress(null);
        toast(t("order.addressUpdated"), "success");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!order) return;
    if (!await confirm({ title: t("order.deleteTitle"), description: t("order.deleteConfirm") })) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "DELETE",
        headers: { Authorization: await authHeader() },
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error ?? t("toast.somethingWentWrong"), "error");
      } else {
        router.push("/orders");
      }
    } finally {
      setSaving(false);
    }
  }

  function openAddressForm() {
    if (!order) return;
    setDraftAddress({ ...order.shippingAddress });
    setAddressFormOpen(true);
  }

  async function handleShowQR() {
    if (!order) return;
    setQrLoading(true);
    try {
      const res = await fetch("/api/vietqr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: await authHeader(),
        },
        body: JSON.stringify({ amount: order.totalAmount, orderCode: order.orderCode }),
      });
      if (!res.ok) throw new Error(t("toast.qrFailed"));
      const { qrUrl: url } = await res.json();
      setQrUrl(url);
    } catch (err) {
      toast(err instanceof Error ? err.message : t("toast.somethingWentWrong"), "error");
    } finally {
      setQrLoading(false);
    }
  }

  async function handlePayWithMomo() {
    if (!order) return;
    setQrLoading(true);
    try {
      const res = await fetch("/api/momo/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: await authHeader(),
        },
        body: JSON.stringify({ orderId: order.id, orderCode: order.orderCode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("toast.momoFailed"));
      }
      const { payUrl } = await res.json();
      window.location.href = payUrl;
    } catch (err) {
      toast(err instanceof Error ? err.message : t("toast.somethingWentWrong"), "error");
      setQrLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-gray-200" />
          <div className="h-32 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900">{t("order.notFound")}</h1>
      </div>
    );
  }

  const showCancel = order.orderStatus === "pending";
  const showUpdateAddress = order.orderStatus === "pending" || order.orderStatus === "confirmed";
  const showDelete = order.orderStatus === "cancelled";
  const showPayment =
    order.paymentStatus === "pending" && order.orderStatus === "pending";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("order.order")} {order.orderCode}
        </h1>
        <span className="text-sm text-gray-500">
          {formatDate(order.createdAt, fmtLocale)}
        </span>
      </div>

      {/* Timeline */}
      <div className="mb-8 rounded-lg border p-6">
        <OrderTimeline currentStatus={order.orderStatus} />
      </div>

      {/* Status badges */}
      <div className="mb-6 flex gap-3">
        <div>
          <span className="text-xs text-gray-500">{t("order.payment")}</span>{" "}
          <Badge variant={order.paymentStatus}>{t(`status.${order.paymentStatus}` as TranslationKey)}</Badge>
        </div>
        <div>
          <span className="text-xs text-gray-500">{t("order.order")}</span>{" "}
          <Badge variant={order.orderStatus}>{t(`status.${order.orderStatus}` as TranslationKey)}</Badge>
        </div>
        <div>
          <span className="text-xs text-gray-500">{t("order.method")}</span>{" "}
          <span className="text-sm font-medium">
            {order.paymentMethod === "vietqr" ? t("order.bankTransfer") : t("order.momo")}
          </span>
        </div>
      </div>

      {/* Payment section -- shown when order is awaiting payment */}
      {showPayment && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="mb-3 text-sm font-medium text-amber-800">
            {t("order.pendingPayment")}
          </p>
          {order.paymentMethod === "vietqr" && !qrUrl && (
            <button
              onClick={handleShowQR}
              disabled={qrLoading}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {qrLoading ? t("order.loadingQR") : t("order.showQR")}
            </button>
          )}
          {order.paymentMethod === "vietqr" && qrUrl && (
            <QRDisplay qrUrl={qrUrl} orderCode={order.orderCode} amount={order.totalAmount} />
          )}
          {order.paymentMethod === "momo" && (
            <button
              onClick={handlePayWithMomo}
              disabled={qrLoading}
              className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-50"
            >
              {qrLoading ? t("order.momoRedirecting") : t("order.payWithMomo")}
            </button>
          )}
        </div>
      )}

      {/* Action bar */}
      {(showCancel || showUpdateAddress || showDelete) && (
        <div className="mb-6 rounded-lg border p-4">
          <div className="flex flex-wrap gap-2">
            {showCancel && (
              <button
                onClick={handleCancel}
                disabled={saving}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {t("order.cancelOrder")}
              </button>
            )}
            {showUpdateAddress && !addressFormOpen && (
              <button
                onClick={openAddressForm}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {t("order.updateAddress")}
              </button>
            )}
            {showDelete && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                {t("order.deleteOrder")}
              </button>
            )}
          </div>

          {/* Inline address edit form */}
          {addressFormOpen && draftAddress && (
            <div className="mt-4 border-t pt-4">
              <ShippingForm
                address={draftAddress}
                onChange={(addr) => setDraftAddress(addr)}
              />
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleSaveAddress}
                  disabled={saving}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {saving ? t("form.saving") : t("order.save")}
                </button>
                <button
                  onClick={() => { setAddressFormOpen(false); setDraftAddress(null); }}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {t("form.cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-3 font-medium text-gray-900">{t("order.itemsTitle")}</h2>
        {order.items.map((item, i) => (
          <div
            key={i}
            className="flex justify-between border-b py-2 last:border-0"
          >
            <span className="text-sm text-gray-700">
              {item.name} x {item.qty}
            </span>
            <span className="text-sm font-medium">
              {formatPrice(item.price * item.qty, fmtLocale)}
            </span>
          </div>
        ))}
        <div className="mt-3 space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">{t("order.subtotal")}</span>
            <span>{formatPrice(order.subtotal, fmtLocale)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t("order.shipping")}</span>
            <span>{formatPrice(order.shippingFee, fmtLocale)}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>{t("order.total")}</span>
            <span className="text-amber-700">
              {formatPrice(order.totalAmount, fmtLocale)}
            </span>
          </div>
        </div>
      </div>

      {/* Shipping address */}
      <div className="mt-4 rounded-lg border p-4">
        <h2 className="mb-2 font-medium text-gray-900">{t("order.shippingAddress")}</h2>
        <p className="text-sm text-gray-600">
          {order.shippingAddress.name} - {order.shippingAddress.phone}
        </p>
        <p className="text-sm text-gray-600">
          {order.shippingAddress.address}, {order.shippingAddress.ward}
        </p>
        <p className="text-sm text-gray-600">
          {order.shippingAddress.province}
        </p>
      </div>
    </div>
  );
}
