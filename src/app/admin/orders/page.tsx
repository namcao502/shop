"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Badge } from "@/components/ui/Badge";
import { OrderActions } from "@/components/admin/OrderActions";
import { formatPrice, formatDate } from "@/lib/format";
import type { Order, OrderStatus, PaymentStatus } from "@/lib/types";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleUpdatePayment = async (orderId: string, status: PaymentStatus) => {
    await updateDoc(doc(db, "orders", orderId), {
      paymentStatus: status,
      ...(status === "paid" ? { orderStatus: "confirmed" } : {}),
      updatedAt: serverTimestamp(),
    });
    await fetchOrders();
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    await updateDoc(doc(db, "orders", orderId), {
      orderStatus: status,
      updatedAt: serverTimestamp(),
    });
    await fetchOrders();
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm("Cancel this order and restore stock?")) return;

    await runTransaction(db, async (tx) => {
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists()) return;

      const orderData = orderSnap.data();

      for (const item of orderData.items) {
        const productRef = doc(db, "products", item.productId);
        const productSnap = await tx.get(productRef);
        if (productSnap.exists()) {
          const currentStock = productSnap.data().stock ?? 0;
          tx.update(productRef, { stock: currentStock + item.qty });
        }
      }

      tx.update(orderRef, {
        orderStatus: "cancelled",
        updatedAt: serverTimestamp(),
      });
    });

    await fetchOrders();
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
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Orders</h1>

      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="rounded-lg border bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-sm font-bold">
                  {order.orderCode}
                </span>
                <span className="ml-3 text-sm text-gray-500">
                  {formatDate(order.createdAt)}
                </span>
              </div>
              <span className="text-lg font-bold text-amber-700">
                {formatPrice(order.totalAmount)}
              </span>
            </div>

            <div className="mt-2 flex gap-2">
              <Badge variant={order.paymentStatus}>{order.paymentStatus}</Badge>
              <Badge variant={order.orderStatus}>{order.orderStatus}</Badge>
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
              Ship to: {order.shippingAddress.name},{" "}
              {order.shippingAddress.district}, {order.shippingAddress.city}
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
