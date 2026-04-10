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

  const handleSave = async (data: Omit<Product, "id">) => {
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
        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          {editing ? t("admin.editProduct") : t("admin.newProduct")}
        </h1>
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
        <h1 className="text-2xl font-bold text-gray-900">{t("admin.products")}</h1>
        <Button onClick={() => setCreating(true)}>{t("admin.addProduct")}</Button>
      </div>

      {/* Desktop table */}
      <div className="hidden rounded-lg border bg-white md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-gray-500">
              <th className="px-4 py-2">{t("admin.colName")}</th>
              <th className="px-4 py-2">{t("admin.colPrice")}</th>
              <th className="px-4 py-2">{t("admin.colStock")}</th>
              <th className="px-4 py-2">{t("admin.colStatus")}</th>
              <th className="px-4 py-2">{t("admin.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b last:border-0">
                <td className="px-4 py-2 font-medium">{product.name}</td>
                <td className="px-4 py-2">{formatPrice(product.price, locale === "vi" ? "vi-VN" : "en-US")}</td>
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
          <div key={product.id} className="rounded-lg border bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-gray-900">{product.name}</p>
              {product.isPublished ? (
                <Badge variant="confirmed">{t("admin.published")}</Badge>
              ) : (
                <Badge variant="cancelled">{t("admin.draft")}</Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
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
