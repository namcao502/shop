"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { ProductGrid } from "@/components/products/ProductGrid";
import { CategoryFilter } from "@/components/products/CategoryFilter";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Product, Category } from "@/lib/types";
import type { SiteWideDiscount } from "@/lib/pricing";

export default function ProductsPage() {
  const { t } = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [siteWide, setSiteWide] = useState<SiteWideDiscount>({ active: false, value: 0 });

  useEffect(() => {
    async function fetchData() {
      const [productsSnap, categoriesSnap, settingsSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "products"),
            where("isPublished", "==", true)
          )
        ),
        getDocs(query(collection(db, "categories"), orderBy("order"))),
        getDoc(doc(db, "settings", "discount")),
      ]);

      setProducts(
        productsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product))
      );
      setCategories(
        categoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Category))
      );
      if (settingsSnap.exists()) {
        setSiteWide(settingsSnap.data() as SiteWideDiscount);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const filtered = selectedCategory
    ? products.filter((p) => p.categoryId === selectedCategory)
    : products;

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square rounded bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">{t("products.title")}</h1>
      <div className="mb-6">
        <CategoryFilter
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>
      <ProductGrid products={filtered} siteWide={siteWide} />
    </div>
  );
}
