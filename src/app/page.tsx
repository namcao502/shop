"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, limit, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { ProductGrid } from "@/components/products/ProductGrid";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Product } from "@/lib/types";
import type { SiteWideDiscount } from "@/lib/pricing";

function BlobA({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M300,80 C370,100 410,180 380,270 C350,360 240,400 160,370 C80,340 20,260 40,170 C60,80 130,20 210,30 C260,37 280,65 300,80Z" fill="currentColor"/>
    </svg>
  );
}

function BlobB({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 300" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M220,40 C270,70 290,140 260,200 C230,260 150,290 90,260 C30,230 10,150 40,90 C70,30 140,0 190,20 C205,25 215,34 220,40Z" fill="currentColor"/>
    </svg>
  );
}

function BlobC({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 350 350" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M180,20 C250,10 330,60 340,140 C350,220 300,310 220,330 C140,350 50,300 20,220 C-10,140 30,40 100,20 C130,12 158,23 180,20Z" fill="currentColor"/>
    </svg>
  );
}

export default function HomePage() {
  const { locale, t } = useLocale();
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteWide, setSiteWide] = useState<SiteWideDiscount>({ active: false, value: 0 });

  useEffect(() => {
    async function fetchFeatured() {
      const [snap, settingsSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "products"),
            where("isPublished", "==", true),
            limit(8)
          )
        ),
        getDoc(doc(db, "settings", "discount")),
      ]);
      setFeatured(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      if (settingsSnap.exists()) {
        setSiteWide(settingsSnap.data() as SiteWideDiscount);
      }
      setLoading(false);
    }
    fetchFeatured();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden py-24 sm:py-36">
        <BlobA className="blob-float-1 pointer-events-none absolute -left-32 -top-24 w-[480px] text-amber-200/60 dark:text-amber-900/25" />
        <BlobB className="blob-float-2 pointer-events-none absolute -bottom-16 left-12 w-[260px] text-yellow-200/50 dark:text-yellow-900/20" />
        <BlobC className="blob-float-3 pointer-events-none absolute -right-20 top-8 w-[400px] text-amber-100/75 dark:text-amber-900/20" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center">
          <div className="mb-6 inline-block rounded-full bg-amber-100 px-5 py-1.5 text-xs font-semibold tracking-widest text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            ✦ {t("home.hero.freeShipping")}
          </div>

          <h1 className="font-display mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight text-stone-900 dark:text-stone-50 sm:text-6xl">
            {t("home.hero.title")}
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-stone-500 dark:text-stone-300 sm:text-lg">
            {t("home.hero.subtitle")}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/products"
              className="rounded-full bg-stone-900 px-8 py-3.5 text-sm font-medium text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 dark:bg-stone-100 dark:text-stone-900"
            >
              {t("home.browseAll")}
            </Link>
            <Link
              href="#featured"
              className="rounded-full border border-stone-300 px-8 py-3.5 text-sm font-medium text-stone-700 transition-all hover:-translate-y-0.5 hover:border-stone-500 dark:border-stone-600 dark:text-stone-300 dark:hover:border-stone-400"
            >
              {locale === "vi" ? "Sản phẩm nổi bật" : "Featured Picks"}
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section id="featured" className="mx-auto max-w-7xl px-4 pb-24">
        <div className="mb-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
            {locale === "vi" ? "Bộ sưu tập" : "The Collection"}
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">
            {t("home.featured")}
          </h2>
          <div className="mt-2 h-0.5 w-8 rounded-full bg-amber-400" />
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-700"
                style={{ aspectRatio: "3/4" }}
              />
            ))}
          </div>
        ) : (
          <ProductGrid products={featured} siteWide={siteWide} />
        )}
      </section>
    </div>
  );
}
