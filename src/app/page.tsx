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
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-5xl">
            {t("home.hero.title")}
          </h1>
          <p className="mt-4 text-base text-stone-500 sm:text-lg">
            {t("home.hero.subtitle")}
          </p>
          <Link href="/products">
            <Button
              size="lg"
              className="mt-6 shadow-[0_4px_14px_rgba(217,119,6,0.4)]"
            >
              {t("home.browseAll")}
            </Button>
          </Link>
          <p className="mt-3 text-sm text-stone-400">
            {t("home.hero.freeShipping")}
          </p>
        </div>
      </section>

      {/* Featured Products */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="rounded-2xl border border-white/80 bg-white/55 p-5 shadow-sm backdrop-blur-md">
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">
              {t("home.featured")}
            </h2>
            <div className="mt-1 h-0.5 w-7 rounded bg-amber-500" />
          </div>
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded bg-stone-200" />
              ))}
            </div>
          ) : (
            <ProductGrid products={featured} />
          )}
        </div>
      </section>
    </div>
  );
}
