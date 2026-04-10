"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Badge } from "@/components/ui/Badge";
import { OrderActions } from "@/components/admin/OrderActions";
import { formatPrice, formatDate } from "@/lib/format";
import { useAuth } from "@/lib/firebase/auth-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { useConfirm } from "@/lib/confirm-context";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { Order, OrderStatus, PaymentStatus } from "@/lib/types";

export default function AdminOrdersPage() {
  const { getIdToken } = useAuth();
  const { locale, t } = useLocale();
  const confirm = useConfirm();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchOrders = async () => {
    const snap = await getDocs(
      query(collection(db, "orders"), orderBy("createdAt", "desc"))
    );
    setOrders(
      snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate() ?? new Date(),
          updatedAt: data.updatedAt?.toDate() ?? new Date(),
        } as Order;
      })
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const callOrderApi = async (orderId: string, body: Record<string, unknown>) => {
    setActionError(null);
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(data.error ?? "Action failed");
      return;
    }
    await fetchOrders();
  };

  const handleUpdatePayment = async (orderId: string, status: PaymentStatus) => {
    if (status === "paid") {
      await callOrderApi(orderId, { action: "confirm_payment" });
    }
    // Other payment status transitions are not supported via the admin UI
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    const actionMap: Partial<Record<OrderStatus, string>> = {
      shipping: "ship",
      delivered: "deliver",
      cancelled: "cancel",
    };
    const action = actionMap[status];
    if (action) {
      await callOrderApi(orderId, { action });
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!await confirm({ title: t("admin.cancelTitle"), description: t("admin.cancelConfirm") })) return;
    await callOrderApi(orderId, { action: "cancel" });
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 rounded bg-gray-200" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">{t("admin.orders")}</h1>

      {actionError && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{actionError}</p>
      )}

      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="rounded-lg border bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-sm font-bold">
                  {order.orderCode}
                </span>
                <span className="ml-3 text-sm text-gray-500">
                  {formatDate(order.createdAt, locale === "vi" ? "vi-VN" : "en-US")}
                </span>
              </div>
              <span className="text-lg font-bold text-amber-700">
                {formatPrice(order.totalAmount, locale === "vi" ? "vi-VN" : "en-US")}
              </span>
            </div>

            <div className="mt-2 flex gap-2">
              <Badge variant={order.paymentStatus}>{t(`status.${order.paymentStatus}` as TranslationKey)}</Badge>
              <Badge variant={order.orderStatus}>{t(`status.${order.orderStatus}` as TranslationKey)}</Badge>
              <span className="text-xs text-gray-500">
                {order.paymentMethod === "vietqr" ? "VietQR" : "MoMo"}
              </span>
            </div>

            <div className="mt-2 text-sm text-gray-600">
              {order.items.map((item, i) => (
                <span key={i}>
                  {item.name} x{item.qty}
                  {i < order.items.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>

            <div className="mt-2 text-xs text-gray-500">
              {t("admin.shipTo")} {order.shippingAddress.name},{" "}
              {order.shippingAddress.ward}, {order.shippingAddress.province}
            </div>

            <div className="mt-3">
              <OrderActions
                order={order}
                onUpdatePayment={handleUpdatePayment}
                onUpdateStatus={handleUpdateStatus}
                onCancel={handleCancel}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
