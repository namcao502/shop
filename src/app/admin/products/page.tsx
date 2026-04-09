"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { ProductForm } from "@/components/admin/ProductForm";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import { useConfirm } from "@/lib/confirm-context";
import type { Product, Category } from "@/lib/types";

export default function AdminProductsPage() {
  const { locale, t } = useLocale();
  const confirm = useConfirm();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

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
    if (editing) {
      await updateDoc(doc(db, "products", editing.id), { ...data });
    } else {
      const ref = doc(collection(db, "products"));
      await setDoc(ref, { ...data });
    }
    setEditing(null);
    setCreating(false);
    await fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({ title: t("admin.deleteTitle"), description: t("admin.deleteConfirm") })) return;
    await deleteDoc(doc(db, "products", id));
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
        <ProductForm
          product={editing ?? undefined}
          categories={categories}
          onSave={handleSave}
          onCancel={() => {
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

      <div className="rounded-lg border bg-white">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(product)}
                    >
                      {t("admin.edit")}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                    >
                      {t("admin.delete")}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
