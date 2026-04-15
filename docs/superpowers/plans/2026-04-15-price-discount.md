# Price Discount Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-product, bulk, and site-wide discount support with server-side enforcement and customer-facing badge/strikethrough display.

**Architecture:** Discounts are stored as a computed `discountPrice` on each product document, with a single `settings/discount` Firestore doc for site-wide overrides. A shared `calculateEffectivePrice` utility encodes priority logic (site-wide > per-product > none) and is used by both the client and the order API transaction.

**Tech Stack:** Next.js 16 App Router, TypeScript, Firebase Admin SDK, Firestore, Zod 4, Tailwind CSS, React 19

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/types.ts` | Modify | Add `discountPrice?: number` to `Product` |
| `src/lib/pricing.ts` | Create | `calculateEffectivePrice`, `discountPercent` utilities |
| `src/lib/i18n/translations.ts` | Modify | Add 8 new translation keys |
| `src/lib/i18n/en.ts` | Modify | English values for new keys |
| `src/lib/i18n/vi.ts` | Modify | Vietnamese values for new keys |
| `src/app/api/products/route.ts` | Modify | Accept optional `discountPrice` in POST schema |
| `src/app/api/products/[id]/route.ts` | Modify | Accept `discountPrice \| null` in PUT schema |
| `src/app/api/settings/discount/route.ts` | Create | GET + PATCH for site-wide discount settings |
| `src/app/api/orders/route.ts` | Modify | Read site-wide discount in transaction, compute effective price |
| `src/components/admin/ProductForm.tsx` | Modify | Discount input with VND/% toggle |
| `src/app/admin/products/page.tsx` | Modify | Checkboxes, bulk apply/remove discount action bar |
| `src/app/admin/settings/page.tsx` | Create | Site-wide sale toggle UI |
| `src/components/layout/AdminSidebar.tsx` | Modify | Add Settings nav link |
| `src/components/products/ProductCard.tsx` | Modify | Accept `siteWide` prop, show badge + strikethrough |
| `src/components/products/ProductGrid.tsx` | Modify | Accept + pass `siteWide` prop |
| `src/app/products/page.tsx` | Modify | Fetch site-wide discount, pass to ProductGrid |
| `src/app/page.tsx` | Modify | Fetch site-wide discount, pass to ProductGrid |
| `src/app/products/[slug]/page.tsx` | Modify | Fetch site-wide discount, show badge + "You save", use effective price in addToCart |

---

## Task 1: Foundation — types, pricing utility, i18n

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/pricing.ts`
- Modify: `src/lib/i18n/translations.ts`
- Modify: `src/lib/i18n/en.ts`
- Modify: `src/lib/i18n/vi.ts`

- [ ] **Step 1: Add `discountPrice` to `Product` type**

In `src/lib/types.ts`, change the `Product` interface:

```ts
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: string[];
  categoryId: string;
  stock: number;
  isPublished: boolean;
}
```

- [ ] **Step 2: Create `src/lib/pricing.ts`**

```ts
import type { Product } from "@/lib/types";

export interface SiteWideDiscount {
  active: boolean;
  value: number;
}

export function calculateEffectivePrice(
  product: Pick<Product, "price" | "discountPrice">,
  siteWide?: SiteWideDiscount
): number {
  if (siteWide?.active && siteWide.value > 0) {
    return Math.floor(product.price * (1 - siteWide.value / 100));
  }
  if (product.discountPrice != null && product.discountPrice < product.price) {
    return product.discountPrice;
  }
  return product.price;
}

export function discountPercent(original: number, effective: number): number {
  return Math.round((1 - effective / original) * 100);
}
```

- [ ] **Step 3: Add translation keys to `src/lib/i18n/translations.ts`**

Inside the `TranslationKey` union, after `| "validation.categoryRequired"`, add:

```ts
  | "validation.discountPriceInvalid"
```

After `| "product.inStock"`, add:

```ts
  | "product.youSave"
```

After `| "admin.shipTo"`, add:

```ts
  | "admin.settings"
  | "admin.siteWideSale"
  | "admin.siteWideSaleDesc"
  | "admin.applyDiscount"
  | "admin.removeDiscount"
```

After `| "form.price"`, add:

```ts
  | "form.discountPrice"
```

- [ ] **Step 4: Add English translations to `src/lib/i18n/en.ts`**

After `"validation.categoryRequired": "Category is required",`, add:

```ts
  "validation.discountPriceInvalid": "Discount price must be less than regular price",
```

After `"product.inStock": "in stock",`, add:

```ts
  "product.youSave": "You save {amount} ({percent}%)",
```

After `"admin.shipTo": "Ship to:",`, add:

```ts
  "admin.settings": "Settings",
  "admin.siteWideSale": "Site-wide Sale",
  "admin.siteWideSaleDesc": "Overrides all product discounts",
  "admin.applyDiscount": "Apply Discount",
  "admin.removeDiscount": "Remove Discount",
```

After `"form.price": "Price (VND)",`, add:

```ts
  "form.discountPrice": "Discount",
```

- [ ] **Step 5: Add Vietnamese translations to `src/lib/i18n/vi.ts`**

Use proper Vietnamese with diacritics, matching the style of the existing entries in `vi.ts`.

After `"validation.categoryRequired": "Danh mục là bắt buộc",` (find the actual line), add:

```ts
  "validation.discountPriceInvalid": "Giá giảm phải nhỏ hơn giá gốc",
```

After `"product.inStock": "còn hàng",`, add:

```ts
  "product.youSave": "Bạn tiết kiệm {amount} ({percent}%)",
```

After `"admin.shipTo": "Giao đến:",`, add:

```ts
  "admin.settings": "Cài đặt",
  "admin.siteWideSale": "Khuyến mãi toàn cửa hàng",
  "admin.siteWideSaleDesc": "Ghi đè tất cả giảm giá sản phẩm",
  "admin.applyDiscount": "Áp dụng giảm giá",
  "admin.removeDiscount": "Xóa giảm giá",
```

After `"form.price": "Giá (VND)",`, add:

```ts
  "form.discountPrice": "Giảm giá",
```

- [ ] **Step 6: Type-check**

```bash
cd C:/ex-project/shop && npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/pricing.ts src/lib/i18n/translations.ts src/lib/i18n/en.ts src/lib/i18n/vi.ts
git commit -m "feat: add discountPrice type, pricing utility, and i18n keys"
```

---

## Task 2: API — Product create and update routes

**Files:**
- Modify: `src/app/api/products/route.ts`
- Modify: `src/app/api/products/[id]/route.ts`

- [ ] **Step 1: Add `discountPrice` to POST schema in `src/app/api/products/route.ts`**

Replace the existing `productSchema`:

```ts
const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(5000).default(""),
  price: z.number().int().min(1, "Price must be at least 1"),
  discountPrice: z.number().int().min(1).optional(),
  stock: z.number().int().min(0, "Stock cannot be negative"),
  categoryId: z.string().min(1, "Category is required"),
  isPublished: z.boolean().default(false),
  images: z.array(z.string().url()).max(10).default([]),
}).refine(
  (data) => data.discountPrice == null || data.discountPrice < data.price,
  { message: "Discount price must be less than regular price", path: ["discountPrice"] }
);
```

- [ ] **Step 2: Add `discountPrice` to PUT schema in `src/app/api/products/[id]/route.ts`**

Replace the existing `productUpdateSchema`:

```ts
const productUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(5000).default(""),
  price: z.number().int().min(1, "Price must be at least 1"),
  discountPrice: z.number().int().min(1).nullable().optional(),
  stock: z.number().int().min(0, "Stock cannot be negative"),
  categoryId: z.string().min(1, "Category is required"),
  isPublished: z.boolean().default(false),
  images: z.array(z.string().url()).max(10).default([]),
}).refine(
  (data) => data.discountPrice == null || data.discountPrice < data.price,
  { message: "Discount price must be less than regular price", path: ["discountPrice"] }
);
```

Also update the file: add `FieldValue` to the existing firebase-admin import at the top of the file:

```ts
// change:
import { adminDb } from "@/lib/firebase/admin";
// to:
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
```

Then replace the final `await ref.update(parsed.data)` and `return NextResponse.json(...)` block with:

```ts
const { discountPrice, ...rest } = parsed.data;
const updateData: Record<string, unknown> = { ...rest };
if (discountPrice === null) {
  updateData.discountPrice = FieldValue.delete();
} else if (discountPrice !== undefined) {
  updateData.discountPrice = discountPrice;
}

await ref.update(updateData);

// Build response without FieldValue sentinel
const responseData: Record<string, unknown> = { id, ...rest };
if (discountPrice !== null && discountPrice !== undefined) {
  responseData.discountPrice = discountPrice;
}
return NextResponse.json(responseData);
```

- [ ] **Step 3: Type-check**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/products/route.ts src/app/api/products/[id]/route.ts
git commit -m "feat: accept discountPrice in product create and update API routes"
```

---

## Task 3: API — Settings/discount route

**Files:**
- Create: `src/app/api/settings/discount/route.ts`

- [ ] **Step 1: Create the route file**

Create `src/app/api/settings/discount/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAdminAuth } from "@/lib/verify-admin";
import { z } from "zod";

const settingsRef = () => adminDb.collection("settings").doc("discount");

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const snap = await settingsRef().get();
  if (!snap.exists) {
    return NextResponse.json({ active: false, value: 0 });
  }
  return NextResponse.json(snap.data());
}

const patchSchema = z
  .object({
    active: z.boolean(),
    value: z.number().int().min(0).max(99),
  })
  .refine((data) => !data.active || data.value >= 1, {
    message: "Value must be between 1 and 99 when active",
  });

export async function PATCH(request: NextRequest) {
  const authResult = await verifyAdminAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const raw = await request.json();
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }
  await settingsRef().set(parsed.data);
  return NextResponse.json(parsed.data);
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/settings/discount/route.ts
git commit -m "feat: add GET and PATCH /api/settings/discount route"
```

---

## Task 4: API — Orders effective price enforcement

**Files:**
- Modify: `src/app/api/orders/route.ts`

- [ ] **Step 1: Read `settings/discount` inside the transaction**

In `src/app/api/orders/route.ts`, inside the `runTransaction` callback, add the settings read alongside the existing reads. Replace:

```ts
const [productDocs, counterDoc] = await Promise.all([
  Promise.all(productRefs.map((ref) => tx.get(ref))),
  tx.get(orderCounterRef),
]);
```

With:

```ts
const settingsRef = adminDb.collection("settings").doc("discount");
const [productDocs, counterDoc, settingsDoc] = await Promise.all([
  Promise.all(productRefs.map((ref) => tx.get(ref))),
  tx.get(orderCounterRef),
  tx.get(settingsRef),
]);

const siteWide = settingsDoc.exists
  ? (settingsDoc.data() as { active: boolean; value: number })
  : { active: false, value: 0 };
```

- [ ] **Step 2: Apply effective price per item**

Replace the `orderItems.push(...)` and `subtotal +=` lines inside the product loop:

```ts
// was:
orderItems.push({
  productId: reqItem.productId,
  name: data.name,
  price: data.price,
  qty: reqItem.qty,
});
subtotal += data.price * reqItem.qty;

// replace with:
const effectivePrice =
  siteWide.active && siteWide.value > 0
    ? Math.floor(data.price * (1 - siteWide.value / 100))
    : data.discountPrice != null && data.discountPrice < data.price
    ? data.discountPrice
    : data.price;

orderItems.push({
  productId: reqItem.productId,
  name: data.name,
  price: effectivePrice,
  qty: reqItem.qty,
});
subtotal += effectivePrice * reqItem.qty;
```

- [ ] **Step 3: Type-check**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/orders/route.ts
git commit -m "feat: enforce effective discount price server-side in order creation"
```

---

## Task 5: Admin — ProductForm discount input

**Files:**
- Modify: `src/components/admin/ProductForm.tsx`

- [ ] **Step 1: Update the `onSave` prop type in `ProductFormProps`**

The `onSave` callback must be able to receive `discountPrice: null` so that clearing the field removes an existing discount. Change the interface:

```ts
// change:
interface ProductFormProps {
  product?: Product;
  categories: Category[];
  onSave: (data: Omit<Product, "id">) => Promise<void>;
  onCancel: () => void;
}
// to:
interface ProductFormProps {
  product?: Product;
  categories: Category[];
  onSave: (data: Omit<Product, "id"> & { discountPrice?: number | null }) => Promise<void>;
  onCancel: () => void;
}
```

- [ ] **Step 2: Add discount state to ProductForm**

In `src/components/admin/ProductForm.tsx`, add two new state variables after the existing `price` state:

```ts
const [discountMode, setDiscountMode] = useState<"vnd" | "percent">("vnd");
const [discountInput, setDiscountInput] = useState<string>(
  product?.discountPrice?.toString() ?? ""
);
```

- [ ] **Step 3: Compute `discountPrice` on submit**

In the `handleSubmit` function, before `onSave(...)`, compute the discount price. Pass `null` when the field is cleared (so the PUT endpoint removes the existing discount):

```ts
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
// null = "remove discount"; undefined would mean "don't touch" — we always send explicitly
```

Then pass `discountPrice: computedDiscountPrice` inside `onSave(...)`:

```ts
await onSave({
  name,
  slug,
  description,
  price: parsedPrice,
  discountPrice: computedDiscountPrice,
  stock: parseInt(stock, 10),
  categoryId,
  isPublished,
  images,
});
```

- [ ] **Step 4: Add discount validation**

In the `validate` function, add after the price check:

```ts
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
```

- [ ] **Step 5: Add discount UI in the form**

In the JSX, in the `grid gap-4 sm:grid-cols-3` div (the price/stock/category row), add a fourth column for discount. Change the grid to `sm:grid-cols-4` and add after the price div:

```tsx
<div>
  <label className="text-sm font-medium text-gray-700">{t("form.discountPrice")}</label>
  <div className="mt-1 flex gap-1">
    <input
      type="number"
      value={discountInput}
      onChange={(e) => setDiscountInput(e.target.value)}
      placeholder="—"
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
    />
    <button
      type="button"
      onClick={() => setDiscountMode(discountMode === "vnd" ? "percent" : "vnd")}
      className={`shrink-0 rounded-lg border px-2 py-1 text-xs font-semibold transition-colors ${
        discountMode === "percent"
          ? "border-amber-500 bg-amber-50 text-amber-700"
          : "border-gray-300 bg-gray-50 text-gray-600"
      }`}
    >
      {discountMode === "percent" ? "%" : "VND"}
    </button>
  </div>
  {errors.discountPrice && (
    <p className="mt-1 text-xs text-red-600">{errors.discountPrice}</p>
  )}
</div>
```

Also add `discountPrice` to the `errors` state type — change:

```ts
const [errors, setErrors] = useState<Record<string, string>>({});
```

(No change needed — it is already `Record<string, string>` which covers `discountPrice`.)

- [ ] **Step 6: Type-check**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/ProductForm.tsx
git commit -m "feat: add discount input with VND/percent toggle to admin product form"
```

---

## Task 6: Admin — Products table bulk discount

**Files:**
- Modify: `src/app/admin/products/page.tsx`

- [ ] **Step 1: Add selection and bulk discount state**

At the top of `AdminProductsPage`, add state after the existing state declarations:

```ts
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [bulkOpen, setBulkOpen] = useState(false);
const [bulkValue, setBulkValue] = useState("");
const [bulkMode, setBulkMode] = useState<"vnd" | "percent">("percent");
```

- [ ] **Step 2: Add toggle and bulk action handlers**

Add these functions inside `AdminProductsPage` after `handleDelete`:

```ts
const toggleSelect = (id: string) => {
  setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};

const toggleSelectAll = () => {
  if (selectedIds.size === products.length) {
    setSelectedIds(new Set());
  } else {
    setSelectedIds(new Set(products.map((p) => p.id)));
  }
};

const handleBulkApply = async () => {
  const val = parseInt(bulkValue, 10);
  if (isNaN(val) || val <= 0) return;
  const token = await getIdToken();
  await Promise.all(
    [...selectedIds].map(async (id) => {
      const product = products.find((p) => p.id === id);
      if (!product) return;
      const discountPrice =
        bulkMode === "percent"
          ? Math.floor(product.price * (1 - val / 100))
          : val;
      if (discountPrice <= 0 || discountPrice >= product.price) return;
      await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...product, discountPrice }),
      });
    })
  );
  setSelectedIds(new Set());
  setBulkOpen(false);
  setBulkValue("");
  await fetchData();
};

const handleBulkRemove = async () => {
  const token = await getIdToken();
  await Promise.all(
    [...selectedIds].map((id) => {
      const product = products.find((p) => p.id === id);
      if (!product) return;
      return fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...product, discountPrice: null }),
      });
    })
  );
  setSelectedIds(new Set());
  await fetchData();
};
```

- [ ] **Step 3: Add bulk action bar above the table**

In the JSX, before `{/* Desktop table */}`, add:

```tsx
{selectedIds.size > 0 && (
  <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
    <span className="text-sm font-semibold text-amber-800">
      {selectedIds.size} selected
    </span>
    {bulkOpen ? (
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={bulkValue}
          onChange={(e) => setBulkValue(e.target.value)}
          placeholder="Value"
          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <button
          onClick={() => setBulkMode(bulkMode === "vnd" ? "percent" : "vnd")}
          className={`rounded border px-2 py-1 text-xs font-semibold ${
            bulkMode === "percent"
              ? "border-amber-500 bg-amber-100 text-amber-700"
              : "border-gray-300 bg-white text-gray-600"
          }`}
        >
          {bulkMode === "percent" ? "%" : "VND"}
        </button>
        <Button size="sm" onClick={handleBulkApply}>{t("form.confirm")}</Button>
        <Button size="sm" variant="ghost" onClick={() => setBulkOpen(false)}>{t("form.cancel")}</Button>
      </div>
    ) : (
      <>
        <Button size="sm" onClick={() => setBulkOpen(true)}>{t("admin.applyDiscount")}</Button>
        <Button size="sm" variant="ghost" onClick={handleBulkRemove}>{t("admin.removeDiscount")}</Button>
      </>
    )}
  </div>
)}
```

- [ ] **Step 4: Add checkbox column and discount column to desktop table**

In the `<thead>` row, before the first `<th>`, add:

```tsx
<th className="px-4 py-2 w-8">
  <input
    type="checkbox"
    checked={selectedIds.size === products.length && products.length > 0}
    onChange={toggleSelectAll}
    className="accent-amber-600"
  />
</th>
```

Also add a discount column header after the price header:

```tsx
<th className="px-4 py-2">{t("form.discountPrice")}</th>
```

In each `<tbody>` row, before the first `<td>`, add:

```tsx
<td className="px-4 py-2">
  <input
    type="checkbox"
    checked={selectedIds.has(product.id)}
    onChange={() => toggleSelect(product.id)}
    className="accent-amber-600"
  />
</td>
```

Also add a discount cell after the price cell:

```tsx
<td className="px-4 py-2">
  {product.discountPrice != null
    ? <span className="font-medium text-amber-700">{formatPrice(product.discountPrice, locale === "vi" ? "vi-VN" : "en-US")}</span>
    : <span className="text-gray-400">—</span>}
</td>
```

- [ ] **Step 5: Type-check**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/products/page.tsx
git commit -m "feat: add bulk discount select and apply to admin products table"
```

---

## Task 7: Admin — Settings page and sidebar link

**Files:**
- Create: `src/app/admin/settings/page.tsx`
- Modify: `src/components/layout/AdminSidebar.tsx`

- [ ] **Step 1: Create `src/app/admin/settings/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui/Button";
import type { SiteWideDiscount } from "@/lib/pricing";

export default function AdminSettingsPage() {
  const { getIdToken } = useAuth();
  const { t } = useLocale();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SiteWideDiscount>({ active: false, value: 0 });
  const [inputValue, setInputValue] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const token = await getIdToken();
      const res = await fetch("/api/settings/discount", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: SiteWideDiscount = await res.json();
        setSettings(data);
        setInputValue(data.value.toString());
      }
      setLoading(false);
    }
    load();
  }, [getIdToken]);

  const handleSave = async (patch: Partial<SiteWideDiscount>) => {
    setSaving(true);
    const next = { ...settings, ...patch };
    const token = await getIdToken();
    const res = await fetch("/api/settings/discount", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(next),
    });
    if (res.ok) {
      const data: SiteWideDiscount = await res.json();
      setSettings(data);
      setInputValue(data.value.toString());
      toast(t("toast.productUpdated"), "success");
    } else {
      const json = await res.json().catch(() => ({}));
      toast(json.error ?? t("toast.somethingWentWrong"), "error");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 rounded bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t("admin.settings")}</h1>

      <div className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{t("admin.siteWideSale")}</h2>
            <p className="text-sm text-gray-500">{t("admin.siteWideSaleDesc")}</p>
          </div>
          <button
            onClick={() => handleSave({ active: !settings.active })}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              settings.active ? "bg-amber-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                settings.active ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={99}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <span className="text-sm text-gray-500">% off all products</span>
          <Button
            size="sm"
            disabled={saving}
            onClick={() => {
              const val = parseInt(inputValue, 10);
              if (!isNaN(val) && val >= 1 && val <= 99) {
                handleSave({ value: val });
              }
            }}
          >
            {saving ? t("form.saving") : t("form.update")}
          </Button>
        </div>

        {settings.active && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
            Active: {settings.value}% off all products
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add Settings to `AdminSidebar.tsx`**

Add `"/admin/settings": "⚙️"` to `SIDEBAR_ICONS`:

```ts
const SIDEBAR_ICONS: Record<string, string> = {
  "/admin": "📊",
  "/admin/products": "📦",
  "/admin/orders": "🧾",
  "/admin/settings": "⚙️",
};
```

Add the settings link to the `links` array:

```ts
const links = [
  { href: "/admin", label: t("admin.dashboard") },
  { href: "/admin/products", label: t("admin.products") },
  { href: "/admin/orders", label: t("admin.orders") },
  { href: "/admin/settings", label: t("admin.settings") },
];
```

- [ ] **Step 3: Type-check**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/settings/page.tsx src/components/layout/AdminSidebar.tsx
git commit -m "feat: add admin settings page with site-wide sale toggle"
```

---

## Task 8: Customer — ProductCard and ProductGrid

**Files:**
- Modify: `src/components/products/ProductCard.tsx`
- Modify: `src/components/products/ProductGrid.tsx`

- [ ] **Step 1: Update `ProductCard` to accept `siteWide` prop and show discount**

Replace the full content of `src/components/products/ProductCard.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { calculateEffectivePrice, discountPercent } from "@/lib/pricing";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Product } from "@/lib/types";
import type { SiteWideDiscount } from "@/lib/pricing";

interface ProductCardProps {
  product: Product;
  siteWide?: SiteWideDiscount;
}

function BrokenImageIcon() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-stone-100">
      <svg className="h-10 w-10 text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
        <line x1="3" y1="3" x2="21" y2="21" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function ProductCard({ product, siteWide }: ProductCardProps) {
  const { locale, t } = useLocale();
  const [imgError, setImgError] = useState(false);
  const thumbnail = product.images[0];
  const outOfStock = product.stock <= 0;
  const fmtLocale = locale === "vi" ? "vi-VN" : "en-US";

  const effectivePrice = calculateEffectivePrice(product, siteWide);
  const hasDiscount = effectivePrice < product.price;
  const pct = hasDiscount ? discountPercent(product.price, effectivePrice) : 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-stone-100">
        {thumbnail && !imgError ? (
          <img
            src={thumbnail}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <BrokenImageIcon />
        )}
        {hasDiscount && (
          <div className="absolute left-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">
            -{pct}%
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded bg-white px-3 py-1 text-sm font-medium text-stone-900">
              {t("product.outOfStock")}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-sm font-medium text-stone-900">{product.name}</h3>
        <p className="mt-1 text-lg font-bold text-amber-600">
          {formatPrice(effectivePrice, fmtLocale)}
        </p>
        {hasDiscount && (
          <p className="text-xs text-stone-400 line-through">
            {formatPrice(product.price, fmtLocale)}
          </p>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Update `ProductGrid` to accept and pass `siteWide` prop**

Replace the full content of `src/components/products/ProductGrid.tsx`:

```tsx
"use client";

import { ProductCard } from "./ProductCard";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Product } from "@/lib/types";
import type { SiteWideDiscount } from "@/lib/pricing";

interface ProductGridProps {
  products: Product[];
  siteWide?: SiteWideDiscount;
}

export function ProductGrid({ products, siteWide }: ProductGridProps) {
  const { t } = useLocale();
  if (products.length === 0) {
    return (
      <p className="py-12 text-center text-gray-500">{t("products.noFound")}</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} siteWide={siteWide} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/products/ProductCard.tsx src/components/products/ProductGrid.tsx
git commit -m "feat: show discount badge and strikethrough on product cards"
```

---

## Task 9: Customer — Listing pages fetch site-wide discount

**Files:**
- Modify: `src/app/products/page.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update `src/app/products/page.tsx` to fetch site-wide discount**

Add the Firestore doc read to `fetchData`. In the existing firestore import line, add `doc` and `getDoc`:

```ts
// change:
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
// to:
import { collection, getDocs, query, orderBy, where, doc, getDoc } from "firebase/firestore";
```

Also add the pricing import:

```ts
import type { SiteWideDiscount } from "@/lib/pricing";
```

Add state:

```ts
const [siteWide, setSiteWide] = useState<SiteWideDiscount>({ active: false, value: 0 });
```

Inside `fetchData`, add a parallel fetch of the settings doc:

```ts
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
```

After `setCategories(...)`, add:

```ts
if (settingsSnap.exists()) {
  setSiteWide(settingsSnap.data() as SiteWideDiscount);
}
```

Pass `siteWide` to `ProductGrid` in the JSX:

```tsx
<ProductGrid products={filtered} siteWide={siteWide} />
```

- [ ] **Step 2: Update `src/app/page.tsx` to fetch site-wide discount**

In the existing firestore import line, add `doc` and `getDoc`:

```ts
// change:
import { collection, getDocs, query, where, limit } from "firebase/firestore";
// to:
import { collection, getDocs, query, where, limit, doc, getDoc } from "firebase/firestore";
```

Also add the pricing import:

```ts
import type { SiteWideDiscount } from "@/lib/pricing";
```

Add state:

```ts
const [siteWide, setSiteWide] = useState<SiteWideDiscount>({ active: false, value: 0 });
```

Inside `fetchFeatured`, fetch settings in parallel:

```ts
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
```

Pass `siteWide` to `ProductGrid` in the JSX:

```tsx
<ProductGrid products={featured} siteWide={siteWide} />
```

- [ ] **Step 3: Type-check**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/products/page.tsx src/app/page.tsx
git commit -m "feat: fetch site-wide discount on product listing pages"
```

---

## Task 10: Customer — Product detail page

**Files:**
- Modify: `src/app/products/[slug]/page.tsx`

- [ ] **Step 1: Add imports and state**

In the existing firestore import line in `src/app/products/[slug]/page.tsx`, add `doc` and `getDoc`:

```ts
// change:
import { collection, getDocs, query, where } from "firebase/firestore";
// to:
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
```

Also add:

```ts
import { calculateEffectivePrice, discountPercent } from "@/lib/pricing";
import type { SiteWideDiscount } from "@/lib/pricing";
```

Add state inside the component:

```ts
const [siteWide, setSiteWide] = useState<SiteWideDiscount>({ active: false, value: 0 });
```

- [ ] **Step 2: Fetch site-wide discount alongside product**

Inside `fetchProduct`, after the `snap` is fetched, add a parallel fetch:

```ts
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
```

- [ ] **Step 3: Compute effective price and use it in addToCart**

After `const outOfStock = product.stock <= 0;`, add:

```ts
const effectivePrice = calculateEffectivePrice(product, siteWide);
const hasDiscount = effectivePrice < product.price;
const pct = hasDiscount ? discountPercent(product.price, effectivePrice) : 0;
const saved = product.price - effectivePrice;
const fmtLocale = locale === "vi" ? "vi-VN" : "en-US";
```

In `handleAddToCart`, change `price: product.price` to `price: effectivePrice`:

```ts
addItem({
  productId: product.id,
  name: product.name,
  price: effectivePrice,
  qty,
  image: product.images[0] ?? "",
  slug: product.slug,
});
```

- [ ] **Step 4: Update the price display JSX**

Replace the existing price paragraph:

```tsx
<p className="mt-2 text-3xl font-bold text-amber-700">
  {formatPrice(product.price, locale === "vi" ? "vi-VN" : "en-US")}
</p>
```

With:

```tsx
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
```

- [ ] **Step 5: Add discount badge to main image**

In the image section, inside the `aspect-square overflow-hidden` div, add the badge after the `<img>`:

```tsx
{hasDiscount && (
  <div className="absolute left-3 top-3 rounded bg-red-600 px-2 py-1 text-sm font-bold text-white">
    -{pct}%
  </div>
)}
```

Make sure the parent div has `relative` class (it already has `overflow-hidden rounded-lg bg-gray-100` — add `relative` to it):

```tsx
<div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
```

- [ ] **Step 6: Type-check**

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/products/[slug]/page.tsx
git commit -m "feat: show discount badge and you-save line on product detail page"
```

---

## Done

After all 10 tasks, the discount feature is complete:
- `npm run build` passes cleanly
- Admin can set per-product discount (fixed or %), bulk-apply to multiple products, and toggle a site-wide sale
- Customers see red badge, strikethrough original, and "You save" on the detail page
- Order API enforces effective prices server-side — the client cannot fake a lower price
