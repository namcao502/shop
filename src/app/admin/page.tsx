"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { KPICards } from "@/components/admin/KPICards";
import { RecentOrdersTable } from "@/components/admin/RecentOrdersTable";
import { TopProducts } from "@/components/admin/TopProducts";
import { StatusBreakdown } from "@/components/admin/StatusBreakdown";
import { formatPrice } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Order, OrderStatus } from "@/lib/types";

export default function AdminDashboardPage() {
  const { locale, t } = useLocale();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const snap = await getDocs(
        query(collection(db, "orders"), orderBy("createdAt", "desc"))
      );

      const allOrders = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() ?? new Date(),
          updatedAt: data.updatedAt?.toDate() ?? new Date(),
        } as Order;
      });

      setOrders(allOrders);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-32 rounded bg-gray-200" /></div>;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
  const todayOrders = orders.filter((o) => o.createdAt >= todayStart);
  const todayRevenue = paidOrders
    .filter((o) => o.createdAt >= todayStart)
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const monthRevenue = paidOrders
    .filter((o) => o.createdAt >= monthStart)
    .reduce((sum, o) => sum + o.totalAmount, 0);

  // Top products
  const productSales = new Map<string, { name: string; sold: number }>();
  for (const order of paidOrders) {
    for (const item of order.items) {
      const existing = productSales.get(item.productId);
      if (existing) {
        existing.sold += item.qty;
      } else {
        productSales.set(item.productId, { name: item.name, sold: item.qty });
      }
    }
  }
  const topProducts = Array.from(productSales.values())
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  // Status breakdown
  const statusCounts: Record<OrderStatus, number> = {
    pending: 0,
    confirmed: 0,
    shipping: 0,
    delivered: 0,
    cancelled: 0,
  };
  for (const order of orders) {
    statusCounts[order.orderStatus]++;
  }

  const fmtLocale = locale === "vi" ? "vi-VN" : "en-US";
  const kpis = [
    { label: t("admin.revenueToday"), value: formatPrice(todayRevenue, fmtLocale) },
    {
      label: t("admin.ordersToday"),
      value: String(todayOrders.length),
      sub: `${todayOrders.filter((o) => o.paymentStatus === "pending").length} ${t("admin.pendingLabel")}`,
    },
    {
      label: t("admin.revenueMonth"),
      value: formatPrice(monthRevenue, fmtLocale),
      sub: `${paidOrders.filter((o) => o.createdAt >= monthStart).length} ${t("admin.ordersLabel")}`,
    },
    {
      label: t("admin.pendingPayment"),
      value: String(orders.filter((o) => o.paymentStatus === "pending").length),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t("admin.dashboard")}</h1>
      <KPICards kpis={kpis} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentOrdersTable orders={orders.slice(0, 10)} />
        </div>
        <div className="space-y-6">
          <TopProducts products={topProducts} />
          <StatusBreakdown counts={statusCounts} />
        </div>
      </div>
    </div>
  );
}
