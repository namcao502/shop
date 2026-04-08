"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { ProductGrid } from "@/components/products/ProductGrid";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Product } from "@/lib/types";

export default function HomePage() {
  const { t } = useLocale();
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeatured() {
      const snap = await getDocs(
        query(
          collection(db, "products"),
          where("isPublished", "==", true),
          limit(8)
        )
      );
      setFeatured(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    }
    fetchFeatured();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-amber-50 py-16">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="text-4xl font-bold text-gray-900">
            {t("home.hero.title")}
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            {t("home.hero.subtitle")}
          </p>
          <Link href="/products">
            <Button size="lg" className="mt-6">
              {t("home.browseAll")}
            </Button>
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-6 text-xl font-bold text-gray-900">
          {t("home.featured")}
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded bg-gray-200" />
            ))}
          </div>
        ) : (
          <ProductGrid products={featured} />
        )}
      </section>
    </div>
  );
}
