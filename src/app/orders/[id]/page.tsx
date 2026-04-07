"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, formatDate } from "@/lib/format";
import type { Order } from "@/lib/types";

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
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
      setLoading(false);
    }
    fetchOrder();
  }, [params.id]);

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
        <h1 className="text-xl font-bold text-gray-900">Order not found</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Order {order.orderCode}
        </h1>
        <span className="text-sm text-gray-500">
          {formatDate(order.createdAt)}
        </span>
      </div>

      {/* Timeline */}
      <div className="mb-8 rounded-lg border p-6">
        <OrderTimeline currentStatus={order.orderStatus} />
      </div>

      {/* Status badges */}
      <div className="mb-6 flex gap-3">
        <div>
          <span className="text-xs text-gray-500">Payment:</span>{" "}
          <Badge variant={order.paymentStatus}>{order.paymentStatus}</Badge>
        </div>
        <div>
          <span className="text-xs text-gray-500">Order:</span>{" "}
          <Badge variant={order.orderStatus}>{order.orderStatus}</Badge>
        </div>
        <div>
          <span className="text-xs text-gray-500">Method:</span>{" "}
          <span className="text-sm font-medium">
            {order.paymentMethod === "vietqr" ? "Bank Transfer (VietQR)" : "MoMo"}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-3 font-medium text-gray-900">Items</h2>
        {order.items.map((item, i) => (
          <div
            key={i}
            className="flex justify-between border-b py-2 last:border-0"
          >
            <span className="text-sm text-gray-700">
              {item.name} x {item.qty}
            </span>
            <span className="text-sm font-medium">
              {formatPrice(item.price * item.qty)}
            </span>
          </div>
        ))}
        <div className="mt-3 space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Shipping</span>
            <span>{formatPrice(order.shippingFee)}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span className="text-amber-700">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Shipping address */}
      <div className="mt-4 rounded-lg border p-4">
        <h2 className="mb-2 font-medium text-gray-900">Shipping Address</h2>
        <p className="text-sm text-gray-600">
          {order.shippingAddress.name} - {order.shippingAddress.phone}
        </p>
        <p className="text-sm text-gray-600">
          {order.shippingAddress.address}, {order.shippingAddress.district}
        </p>
        <p className="text-sm text-gray-600">
          {order.shippingAddress.city}, {order.shippingAddress.province}
        </p>
      </div>
    </div>
  );
}
