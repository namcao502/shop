"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/lib/i18n/locale-context";
import { ImageUploader } from "@/components/admin/ImageUploader";
import type { Product, Category } from "@/lib/types";

interface ProductFormProps {
  product?: Product;
  categories: Category[];
  onSave: (data: Omit<Product, "id">) => Promise<void>;
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
  const [stock, setStock] = useState(product?.stock?.toString() ?? "0");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [isPublished, setIsPublished] = useState(product?.isPublished ?? true);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [saving, setSaving] = useState(false);
  const { t } = useLocale();

  const handleNameChange = (value: string) => {
    setName(value);
    if (!product) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      );
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    await onSave({
      name,
      slug,
      description,
      price: parseInt(price, 10) || 0,
      stock: parseInt(stock, 10) || 0,
      categoryId,
      isPublished,
      images,
    });
    setSaving(false);
  };

  return (
    <div className="space-y-4 rounded-lg border bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t("form.productName")}
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
        />
        <Input
          label={t("form.slug")}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">{t("form.description")}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          rows={3}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label={t("form.price")}
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <Input
          label={t("form.stock")}
          type="number"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">{t("form.category")}</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          >
            <option value="">{t("form.selectCategory")}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">
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
        <span className="text-sm text-gray-700">{t("form.published")}</span>
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
