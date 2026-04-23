"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/lib/firebase/auth-context";
import { ProductForm } from "@/components/admin/ProductForm";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import { useConfirm } from "@/lib/confirm-context";
import { useToast } from "@/lib/toast-context";
import type { Product, Category } from "@/lib/types";

export default function AdminProductsPage() {
  const { locale, t } = useLocale();
  const { getIdToken } = useAuth();
  const confirm = useConfirm();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkValue, setBulkValue] = useState("");
  const [bulkMode, setBulkMode] = useState<"vnd" | "percent">("percent");

  const fetchData = async () => {
    const [prodSnap, catSnap] = await Promise.all([
      getDocs(collection(db, "products")),
      getDocs(query(collection(db, "categories"), orderBy("order"))),
    ]);

    setProducts(
      prodSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product))
    );
    setCategories(
      catSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Category))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (data: Omit<Product, "id" | "discountPrice"> & { discountPrice?: number | null }) => {
    setSaveError(null);
    const token = await getIdToken();
    const isEdit = !!editing;
    const res = await fetch(
      isEdit ? `/api/products/${editing!.id}` : "/api/products",
      {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      }
    );
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      const msg = json.error ?? "Failed to save product";
      setSaveError(msg);
      toast(msg, "error");
      return;
    }
    toast(t(isEdit ? "toast.productUpdated" : "toast.productCreated"), "success");
    setEditing(null);
    setCreating(false);
    await fetchData();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const handleBulkApply = async () => {
    const val = parseInt(bulkValue, 10);
    if (isNaN(val) || val <= 0) return;
    const token = await getIdToken();
    await Promise.all(
      [...selectedIds].map(async (id) => {
        const product = products.find((p) => p.id === id);
        if (!product) return;
        const discountPrice =
          bulkMode === "percent"
            ? Math.floor(product.price * (1 - val / 100))
            : val;
        if (discountPrice <= 0 || discountPrice >= product.price) return;
        await fetch(`/api/products/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...product, discountPrice }),
        });
      })
    );
    setSelectedIds(new Set());
    setBulkOpen(false);
    setBulkValue("");
    await fetchData();
  };

  const handleBulkRemove = async () => {
    const token = await getIdToken();
    await Promise.all(
      [...selectedIds].map((id) => {
        const product = products.find((p) => p.id === id);
        if (!product) return;
        return fetch(`/api/products/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...product, discountPrice: null }),
        });
      })
    );
    setSelectedIds(new Set());
    await fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({ title: t("admin.deleteTitle"), description: t("admin.deleteConfirm") })) return;
    const token = await getIdToken();
    const res = await fetch(`/api/products/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 204) {
      const json = await res.json().catch(() => ({}));
      toast(json.error ?? "Failed to delete product", "error");
      return;
    }
    toast(t("toast.productDeleted"), "info");
    await fetchData();
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 rounded bg-gray-200" />
      </div>
    );
  }

  if (creating || editing) {
    return (
      <div>
        <h1 className="font-display mb-3 text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          {editing ? t("admin.editProduct") : t("admin.newProduct")}
        </h1>
        <div className="mb-6 h-0.5 w-8 rounded-full bg-amber-400" />
        {saveError && (
          <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{saveError}</p>
        )}
        <ProductForm
          product={editing ?? undefined}
          categories={categories}
          onSave={handleSave}
          onCancel={() => {
            setSaveError(null);
            setCreating(false);
            setEditing(null);
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          {t("admin.products")}
        </h1>
        <div className="mt-1 h-0.5 w-8 rounded-full bg-amber-400" />
        <Button onClick={() => setCreating(true)}>{t("admin.addProduct")}</Button>
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <span className="text-sm font-semibold text-amber-800">
            {selectedIds.size} selected
          </span>
          {bulkOpen ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                placeholder="Value"
                className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
              />
              <button
                onClick={() => setBulkMode(bulkMode === "vnd" ? "percent" : "vnd")}
                className={`rounded border px-2 py-1 text-xs font-semibold ${
                  bulkMode === "percent"
                    ? "border-amber-500 bg-amber-100 text-amber-700"
                    : "border-gray-300 bg-white text-gray-600"
                }`}
              >
                {bulkMode === "percent" ? "%" : "VND"}
              </button>
              <Button size="sm" onClick={handleBulkApply}>{t("form.confirm")}</Button>
              <Button size="sm" variant="ghost" onClick={() => setBulkOpen(false)}>{t("form.cancel")}</Button>
            </div>
          ) : (
            <>
              <Button size="sm" onClick={() => setBulkOpen(true)}>{t("admin.applyDiscount")}</Button>
              <Button size="sm" variant="ghost" onClick={handleBulkRemove}>{t("admin.removeDiscount")}</Button>
            </>
          )}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden rounded-2xl bg-white shadow-sm dark:bg-stone-800 md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-stone-500 dark:text-stone-400">
              <th className="px-4 py-2 w-8">
                <input
                  type="checkbox"
                  checked={selectedIds.size === products.length && products.length > 0}
                  onChange={toggleSelectAll}
                  className="accent-amber-600"
                />
              </th>
              <th className="px-4 py-2">{t("admin.colName")}</th>
              <th className="px-4 py-2">{t("admin.colPrice")}</th>
              <th className="px-4 py-2">{t("form.discountPrice")}</th>
              <th className="px-4 py-2">{t("admin.colStock")}</th>
              <th className="px-4 py-2">{t("admin.colStatus")}</th>
              <th className="px-4 py-2">{t("admin.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b last:border-0">
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onChange={() => toggleSelect(product.id)}
                    className="accent-amber-600"
                  />
                </td>
                <td className="px-4 py-2 font-medium">{product.name}</td>
                <td className="px-4 py-2">{formatPrice(product.price, locale === "vi" ? "vi-VN" : "en-US")}</td>
                <td className="px-4 py-2">
                  {product.discountPrice != null
                    ? <span className="font-medium text-amber-700">{formatPrice(product.discountPrice, locale === "vi" ? "vi-VN" : "en-US")}</span>
                    : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-2">
                  <span className={product.stock < 5 ? "font-bold text-red-600" : ""}>
                    {product.stock}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {product.isPublished ? (
                    <Badge variant="confirmed">{t("admin.published")}</Badge>
                  ) : (
                    <Badge variant="cancelled">{t("admin.draft")}</Badge>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(product)}>{t("admin.edit")}</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(product.id)}>{t("admin.delete")}</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {products.map((product) => (
          <div key={product.id} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-800">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-stone-900 dark:text-stone-100">{product.name}</p>
              {product.isPublished ? (
                <Badge variant="confirmed">{t("admin.published")}</Badge>
              ) : (
                <Badge variant="cancelled">{t("admin.draft")}</Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-stone-500 dark:text-stone-400">
              <span>{formatPrice(product.price, locale === "vi" ? "vi-VN" : "en-US")}</span>
              <span>·</span>
              <span className={product.stock < 5 ? "font-bold text-red-600" : ""}>
                {t("admin.colStock")}: {product.stock}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(product)}>{t("admin.edit")}</Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(product.id)}>{t("admin.delete")}</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
