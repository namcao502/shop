"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui/Button";
import type { Product } from "@/lib/types";

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

  useEffect(() => {
    async function fetchProduct() {
      const snap = await getDocs(
        query(
          collection(db, "products"),
          where("slug", "==", params.slug),
          where("isPublished", "==", true)
        )
      );
      if (snap.empty) {
        setLoading(false);
        return;
      }
      const doc = snap.docs[0];
      setProduct({ id: doc.id, ...doc.data() } as Product);
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
        <h1 className="text-xl font-bold text-gray-900">{t("product.notFound")}</h1>
        <Button className="mt-4" onClick={() => router.push("/products")}>
          {t("product.backToProducts")}
        </Button>
      </div>
    );
  }

  const outOfStock = product.stock <= 0;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
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
          <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
            <img
              src={product.images[selectedImage] ?? "/placeholder.svg"}
              alt={product.name}
              className="h-full w-full object-cover"
            />
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
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="mt-2 text-3xl font-bold text-amber-700">
            {formatPrice(product.price, locale === "vi" ? "vi-VN" : "en-US")}
          </p>
          <p className="mt-4 text-gray-600">{product.description}</p>

          {outOfStock ? (
            <p className="mt-6 text-lg font-medium text-red-600">{t("product.outOfStock")}</p>
          ) : (
            <div className="mt-6 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded border text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200"
                >
                  -
                </button>
                <span className="w-8 text-center">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(product.stock, qty + 1))}
                  className="flex h-8 w-8 items-center justify-center rounded border text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200"
                >
                  +
                </button>
              </div>
              <Button onClick={handleAddToCart}>
                {t("product.addToCart")}
              </Button>
            </div>
          )}

          <p className="mt-4 text-sm text-gray-500">
            {product.stock > 0 ? `${product.stock} ${t("product.inStock")}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
