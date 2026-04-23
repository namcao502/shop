"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/lib/i18n/locale-context";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { toSlug } from "@/lib/slug";
import type { Product, Category } from "@/lib/types";

interface ProductFormProps {
  product?: Product;
  categories: Category[];
  onSave: (data: Omit<Product, "id" | "discountPrice"> & { discountPrice?: number | null }) => Promise<void>;
  onCancel: () => void;
}

export function ProductForm({
  product,
  categories,
  onSave,
  onCancel,
}: ProductFormProps) {
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [discountMode, setDiscountMode] = useState<"vnd" | "percent">("vnd");
  const [discountInput, setDiscountInput] = useState<string>(
    product?.discountPrice?.toString() ?? ""
  );
  const [stock, setStock] = useState(product?.stock?.toString() ?? "0");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [isPublished, setIsPublished] = useState(product?.isPublished ?? true);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { t } = useLocale();

  const handleNameChange = (value: string) => {
    setName(value);
    if (!product) {
      setSlug(toSlug(value));
    }
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = t("validation.productNameRequired");
    if (!slug.trim()) next.slug = t("validation.slugRequired");
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
      next.slug = t("validation.slugFormat");
    const parsedPrice = parseInt(price, 10);
    if (!price || isNaN(parsedPrice) || parsedPrice < 1) next.price = t("validation.priceMin");
    if (discountInput.trim() !== "") {
      const val = parseInt(discountInput, 10);
      const parsedPriceVal = parseInt(price, 10);
      const computed =
        discountMode === "percent"
          ? Math.floor(parsedPriceVal * (1 - val / 100))
          : val;
      if (isNaN(val) || val <= 0 || computed >= parsedPriceVal || computed <= 0) {
        next.discountPrice = t("validation.discountPriceInvalid");
      }
    }
    const parsedStock = parseInt(stock, 10);
    if (stock === "" || isNaN(parsedStock) || parsedStock < 0) next.stock = t("validation.stockNegative");
    if (!categoryId) next.categoryId = t("validation.categoryRequired");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    const parsedPrice = parseInt(price, 10);
    let computedDiscountPrice: number | null = null;
    if (discountInput.trim() !== "") {
      const val = parseInt(discountInput, 10);
      if (!isNaN(val) && val > 0) {
        computedDiscountPrice =
          discountMode === "percent"
            ? Math.floor(parsedPrice * (1 - val / 100))
            : val;
      }
    }
    // null = "remove discount"; undefined would mean "don't touch" -- we always send explicitly
    const saveData: Omit<Product, "id" | "discountPrice"> & { discountPrice?: number | null } = {
      name,
      slug,
      description,
      price: parsedPrice,
      discountPrice: computedDiscountPrice,
      stock: parseInt(stock, 10),
      categoryId,
      isPublished,
      images,
    };
    await onSave(saveData);
    setSaving(false);
  };

  return (
    <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-stone-800 dark:ring-1 dark:ring-stone-700">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Input
            label={t("form.productName")}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
        </div>
        <div>
          <Input
            label={t("form.slug")}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug}</p>}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-stone-300">{t("form.description")}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"
          rows={3}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <Input
            label={t("form.price")}
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-stone-300">{t("form.discountPrice")}</label>
          <div className="mt-1 flex gap-1">
            <input
              type="number"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              placeholder="—"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"
            />
            <button
              type="button"
              onClick={() => setDiscountMode(discountMode === "vnd" ? "percent" : "vnd")}
              className={`shrink-0 rounded-lg border px-2 py-1 text-xs font-semibold transition-colors ${
                discountMode === "percent"
                  ? "border-amber-500 bg-amber-50 text-amber-700"
                  : "border-gray-300 bg-gray-50 text-gray-600 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-300"
              }`}
            >
              {discountMode === "percent" ? "%" : "VND"}
            </button>
          </div>
          {errors.discountPrice && (
            <p className="mt-1 text-xs text-red-600">{errors.discountPrice}</p>
          )}
        </div>
        <div>
          <Input
            label={t("form.stock")}
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
          {errors.stock && <p className="mt-1 text-xs text-red-600">{errors.stock}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-stone-300">{t("form.category")}</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"
          >
            <option value="">{t("form.selectCategory")}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors.categoryId && <p className="mt-1 text-xs text-red-600">{errors.categoryId}</p>}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-stone-300">
          {t("form.images")}
        </label>
        <div className="mt-2">
          <ImageUploader images={images} onChange={setImages} maxImages={5} />
        </div>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          className="accent-amber-600"
        />
        <span className="text-sm text-gray-700 dark:text-stone-300">{t("form.published")}</span>
      </label>

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? t("form.saving") : product ? t("form.update") : t("form.create")}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t("form.cancel")}
        </Button>
      </div>
    </div>
  );
}
