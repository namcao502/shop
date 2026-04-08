"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/lib/i18n/locale-context";
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
  const [newImageUrl, setNewImageUrl] = useState("");
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

  const addImage = () => {
    if (newImageUrl.trim()) {
      setImages([...images, newImageUrl.trim()]);
      setNewImageUrl("");
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
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
        <div className="mt-2 flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative h-16 w-16 overflow-hidden rounded border">
              <img src={img} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute right-0 top-0 bg-red-600 px-1 text-xs text-white"
              >
                x
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            placeholder={t("form.imageUrl")}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <Button variant="secondary" size="sm" onClick={addImage}>
            {t("form.add")}
          </Button>
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
