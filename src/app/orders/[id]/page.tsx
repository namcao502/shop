"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/lib/firebase/auth-context";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { ShippingForm } from "@/components/checkout/ShippingForm";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, formatDate } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { Order, ShippingAddress } from "@/lib/types";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { locale, t } = useLocale();
  const { getIdToken } = useAuth();
  const fmtLocale = locale === "vi" ? "vi-VN" : "en-US";

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [draftAddress, setDraftAddress] = useState<ShippingAddress | null>(null);

  async function fetchOrder() {
    try {
      const snap = await getDoc(doc(db, "orders", params.id as string));
      if (snap.exists()) {
        const data = snap.data();
        setOrder({
          id: snap.id,
          ...data,
          createdAt: data.createdAt?.toDate() ?? new Date(),
          updatedAt: data.updatedAt?.toDate() ?? new Date(),
        } as Order);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function authHeader(): Promise<string> {
    const token = await getIdToken();
    if (!token) throw new Error("Not authenticated");
    return `Bearer ${token}`;
  }

  async function handleCancel() {
    if (!order) return;
    if (!window.confirm(t("order.cancelConfirm"))) return;
    setSaving(true);
    setActionError(null);
    setSuccessMessage(null);
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
        setActionError(data.error ?? "Something went wrong");
      } else {
        setSuccessMessage(t("order.cancelSuccess"));
        await fetchOrder();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAddress() {
    if (!order || !draftAddress) return;
    setSaving(true);
    setActionError(null);
    setSuccessMessage(null);
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
        setActionError(data.error ?? "Something went wrong");
      } else {
        setAddressFormOpen(false);
        setDraftAddress(null);
        setSuccessMessage(t("order.addressUpdated"));
        await fetchOrder();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!order) return;
    if (!window.confirm(t("order.deleteConfirm"))) return;
    setSaving(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "DELETE",
        headers: { Authorization: await authHeader() },
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? "Something went wrong");
      } else {
        router.push("/orders");
      }
    } finally {
      setSaving(false);
    }
  }

  function openAddressForm() {
    if (!order) return;
    setSuccessMessage(null);
    setDraftAddress({ ...order.shippingAddress });
    setAddressFormOpen(true);
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

          {actionError && (
            <p className="mt-2 text-sm text-red-600">{actionError}</p>
          )}
          {successMessage && (
            <p className="mt-2 text-sm text-green-600">{successMessage}</p>
          )}

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
                  {saving ? "..." : t("order.save")}
                </button>
                <button
                  onClick={() => { setAddressFormOpen(false); setDraftAddress(null); setActionError(null); }}
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
