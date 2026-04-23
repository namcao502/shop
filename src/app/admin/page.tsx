"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { KPICards } from "@/components/admin/KPICards";
import { RecentOrdersTable } from "@/components/admin/RecentOrdersTable";
import { TopProducts } from "@/components/admin/TopProducts";
import { StatusBreakdown } from "@/components/admin/StatusBreakdown";
import { formatPrice } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Order, OrderStatus, Product } from "@/lib/types";

export default function AdminDashboardPage() {
  const { locale, t } = useLocale();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockProducts, setLowStockProducts] = useState<Array<{ id: string; name: string; stock: number }>>([]);

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

      const lowStockSnap = await getDocs(
        query(
          collection(db, "products"),
          where("isPublished", "==", true),
          where("stock", "<=", 5)
        )
      );
      const lowStock = lowStockSnap.docs.map((d) => {
        const data = d.data() as Product;
        return { id: d.id, name: data.name, stock: data.stock };
      });
      setLowStockProducts(lowStock);

      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-32 rounded bg-stone-200" /></div>;
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
    { label: t("admin.revenueToday"), value: formatPrice(todayRevenue, fmtLocale), accent: "primary" as const },
    {
      label: t("admin.ordersToday"),
      value: String(todayOrders.length),
      sub: `${todayOrders.filter((o) => o.paymentStatus === "pending").length} ${t("admin.pendingLabel")}`,
      accent: "neutral" as const,
    },
    {
      label: t("admin.revenueMonth"),
      value: formatPrice(monthRevenue, fmtLocale),
      sub: `${paidOrders.filter((o) => o.createdAt >= monthStart).length} ${t("admin.ordersLabel")}`,
      accent: "neutral" as const,
    },
    {
      label: t("admin.pendingPayment"),
      value: String(orders.filter((o) => o.paymentStatus === "pending").length),
      accent: "warning" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-stone-100/90 pb-4">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
          {t("admin.dashboard")}
        </h1>
      </div>
      {lowStockProducts.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-900/20">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            {t("admin.lowStockAlert").replace("{n}", String(lowStockProducts.length)).replace("{s}", lowStockProducts.length > 1 ? "s" : "")}
          </p>
          <ul className="mt-1 space-y-0.5">
            {lowStockProducts.map((p) => (
              <li key={p.id} className="text-xs text-amber-700 dark:text-amber-400">
                {t("admin.lowStockItem").replace("{name}", p.name).replace("{stock}", String(p.stock))}
              </li>
            ))}
          </ul>
        </div>
      )}
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
