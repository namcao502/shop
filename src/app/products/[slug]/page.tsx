"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui/Button";
import type { Product } from "@/lib/types";
import { calculateEffectivePrice, discountPercent } from "@/lib/pricing";
import type { SiteWideDiscount } from "@/lib/pricing";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  const { locale, t } = useLocale();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [siteWide, setSiteWide] = useState<SiteWideDiscount>({ active: false, value: 0 });

  useEffect(() => {
    async function fetchProduct() {
      const [snap, settingsSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "products"),
            where("slug", "==", params.slug),
            where("isPublished", "==", true)
          )
        ),
        getDoc(doc(db, "settings", "discount")),
      ]);

      if (settingsSnap.exists()) {
        setSiteWide(settingsSnap.data() as SiteWideDiscount);
      }

      if (snap.empty) {
        setLoading(false);
        return;
      }
      const docSnap = snap.docs[0];
      setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
      setLoading(false);
    }
    fetchProduct();
  }, [params.slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="aspect-square w-full max-w-md rounded bg-gray-200" />
          <div className="h-8 w-64 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t("product.notFound")}</h1>
        <Button className="mt-4" onClick={() => router.push("/products")}>
          {t("product.backToProducts")}
        </Button>
      </div>
    );
  }

  const outOfStock = product.stock <= 0;

  const effectivePrice = calculateEffectivePrice(product, siteWide);
  const hasDiscount = effectivePrice < product.price;
  const pct = hasDiscount ? discountPercent(product.price, effectivePrice) : 0;
  const saved = product.price - effectivePrice;
  const fmtLocale = locale === "vi" ? "vi-VN" : "en-US";

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: effectivePrice,
      qty,
      image: product.images[0] ?? "",
      slug: product.slug,
    });
    toast(t("toast.addedToCart"), "success");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Images */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
            <img
              src={product.images[selectedImage] ?? "/placeholder.svg"}
              alt={product.name}
              className="h-full w-full object-cover"
            />
            {hasDiscount && (
              <div className="absolute left-3 top-3 rounded bg-red-600 px-2 py-1 text-sm font-bold text-white">
                -{pct}%
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`h-16 w-16 overflow-hidden rounded border-2 transition-all hover:opacity-80 active:opacity-60 ${
                    selectedImage === i ? "border-amber-600" : "border-transparent hover:border-gray-300"
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{product.name}</h1>
          <div className="mt-2">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-amber-700">
                {formatPrice(effectivePrice, fmtLocale)}
              </span>
              {hasDiscount && (
                <span className="text-lg text-stone-400 line-through">
                  {formatPrice(product.price, fmtLocale)}
                </span>
              )}
            </div>
            {hasDiscount && (
              <p className="mt-1 text-sm font-medium text-red-600">
                {t("product.youSave")
                  .replace("{amount}", formatPrice(saved, fmtLocale))
                  .replace("{percent}", pct.toString())}
              </p>
            )}
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{product.description}</p>

          {outOfStock ? (
            <p className="mt-6 text-lg font-medium text-red-600">{t("product.outOfStock")}</p>
          ) : (
            <div className="mt-6 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded border text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
                >
                  -
                </button>
                <span className="w-8 text-center">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(product.stock, qty + 1))}
                  className="flex h-8 w-8 items-center justify-center rounded border text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
                >
                  +
                </button>
              </div>
              <Button onClick={handleAddToCart}>
                {t("product.addToCart")}
              </Button>
            </div>
          )}

          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {product.stock > 0 ? `${product.stock} ${t("product.inStock")}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
