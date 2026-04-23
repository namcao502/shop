# UI/UX Polish — User & Admin Pages

> **For agentic workers:** Use s3-implement to execute this plan task-by-task.

**Goal:** Propagate the South Tomorrow editorial design language across all user-facing and admin pages — Playfair Display headings, borderless shadow cards, and pill elements.

**Architecture:** Pure className changes only — no structural refactors, no new components, no data model changes. Three patterns cover 95% of the work: (1) serif heading upgrade via `.font-display` class, (2) card container softening (`rounded-lg border` → `rounded-2xl shadow-sm`, no border), (3) pill element rounding (`rounded` → `rounded-full`). All changes build on the font and CSS classes already live from the homepage redesign.

**Tech Stack:** Next.js App Router, Tailwind CSS 4, React 19

---

### Task 1: User page headings — products, cart, checkout

**Files:**
- Modify: `src/app/products/page.tsx`
- Modify: `src/app/cart/page.tsx`
- Modify: `src/app/checkout/page.tsx`

- [ ] **Step 1: Apply heading + divider pattern to each page**

`src/app/products/page.tsx` — heading:
```tsx
// Before
<h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">{t("products.title")}</h1>

// After
<h1 className="font-display mb-3 text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
  {t("products.title")}
</h1>
<div className="mb-8 h-0.5 w-8 rounded-full bg-amber-400" />
```

`src/app/products/page.tsx` — loading skeleton (update rounded and aspect ratio):
```tsx
// Before
<div className="h-8 w-48 rounded bg-gray-200" />
// grid children:
<div key={i} className="aspect-square rounded bg-gray-200" />

// After
<div className="h-8 w-48 rounded-full bg-stone-200 dark:bg-stone-700" />
// grid children:
<div key={i} className="rounded-2xl bg-stone-200 dark:bg-stone-700" style={{ aspectRatio: '3/4' }} />
```

`src/app/cart/page.tsx` — heading:
```tsx
// Before
<h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">{t("cart.title")}</h1>

// After
<h1 className="font-display mb-3 text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
  {t("cart.title")}
</h1>
<div className="mb-8 h-0.5 w-8 rounded-full bg-amber-400" />
```

`src/app/checkout/page.tsx` — heading (locate the h1 with `t("checkout.title")`):
```tsx
// Before
<h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">{t("checkout.title")}</h1>

// After
<h1 className="font-display mb-3 text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
  {t("checkout.title")}
</h1>
<div className="mb-8 h-0.5 w-8 rounded-full bg-amber-400" />
```

`src/app/checkout/page.tsx` — order summary card and error callout:
```tsx
// Before
<div className="rounded-lg border bg-gray-50 p-4 dark:border-stone-700 dark:bg-stone-800/60">
// After
<div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-800">

// Before (error callout)
<div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
// After
<div className="rounded-2xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: Compiled successfully, no TypeScript errors

---

### Task 2: Product detail page

**Files:**
- Modify: `src/app/products/[slug]/page.tsx`

- [ ] **Step 1: Apply image aspect ratio, heading font, and badge pill**

Main product image container — portrait ratio and larger radius:
```tsx
// Before
<div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">

// After
<div className="relative overflow-hidden rounded-2xl bg-stone-100" style={{ aspectRatio: '3/4' }}>
```

Product name heading — add serif font:
```tsx
// Before
<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">

// After
<h1 className="font-display text-2xl font-bold text-stone-900 dark:text-stone-100">
```

Discount badge — pill shape:
```tsx
// Before
<div className="absolute left-3 top-3 rounded bg-red-600 px-2 py-1 text-sm font-bold text-white">

// After
<div className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-0.5 text-sm font-bold text-white">
```

Thumbnail images — slightly rounder (the className is a ternary; update the base segment `rounded` → `rounded-lg`):
```tsx
// Before
className={`h-16 w-16 overflow-hidden rounded border-2 transition-all hover:opacity-80 active:opacity-60 ${
  selectedImage === i ? "border-amber-600" : "border-transparent hover:border-gray-300"
}`}

// After
className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition-all hover:opacity-80 active:opacity-60 ${
  selectedImage === i ? "border-amber-600" : "border-transparent hover:border-stone-300"
}`}
```

Quantity +/- buttons — pill:
```tsx
// Before
className="flex h-8 w-8 items-center justify-center rounded border ..."

// After
className="flex h-8 w-8 items-center justify-center rounded-full border ..."
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: Compiled successfully, no TypeScript errors

---

### Task 3: CategoryFilter, CartItem, CartSummary

**Files:**
- Modify: `src/components/products/CategoryFilter.tsx`
- Modify: `src/components/cart/CartItem.tsx`
- Modify: `src/components/cart/CartSummary.tsx`

- [ ] **Step 1: Apply component-level changes**

`src/components/products/CategoryFilter.tsx` — warmer inactive pill tone:
```tsx
// Before (inactive className)
"bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-stone-700 dark:text-stone-200 dark:hover:bg-stone-600"

// After
"bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600"
```

`src/components/cart/CartItem.tsx` — rounded thumbnail and pill qty buttons:
```tsx
// Before (image wrapper)
<div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded bg-gray-100 dark:bg-stone-700">

// After
<div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-700">

// Before (qty buttons — both - and +)
className="flex h-8 w-8 items-center justify-center rounded border text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"

// After
className="flex h-8 w-8 items-center justify-center rounded-full border text-stone-600 transition-colors hover:bg-stone-100 active:bg-stone-200 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
```

`src/components/cart/CartSummary.tsx` — borderless card and serif subheading:
```tsx
// Before
<div className="rounded-lg border bg-gray-50 p-6 dark:border-stone-700 dark:bg-stone-800/60">
<h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">{t("cart.orderSummary")}</h2>

// After
<div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-stone-800">
<h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">{t("cart.orderSummary")}</h2>
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: Compiled successfully, no TypeScript errors

---

### Task 4: Orders list page + OrderCard component

**Files:**
- Modify: `src/app/orders/page.tsx`
- Modify: `src/components/orders/OrderCard.tsx`

- [ ] **Step 1: Apply heading, skeleton, and card changes**

`src/app/orders/page.tsx` — heading + divider:
```tsx
// Before
<h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">{t("orders.title")}</h1>

// After
<h1 className="font-display mb-3 text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
  {t("orders.title")}
</h1>
<div className="mb-8 h-0.5 w-8 rounded-full bg-amber-400" />
```

`src/app/orders/page.tsx` — loading skeleton:
```tsx
// Before
<div className="h-24 animate-pulse rounded-lg bg-gray-200" />

// After
<div className="animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-700" style={{ height: '96px' }} />
```

`src/components/orders/OrderCard.tsx` — borderless card with lift hover:
```tsx
// Before
className="block rounded-lg border p-4 transition-shadow hover:shadow-md dark:border-stone-700 dark:hover:border-stone-600"

// After
className="block rounded-2xl bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-stone-800"
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: Compiled successfully, no TypeScript errors

---

### Task 5: Order detail page

**Files:**
- Modify: `src/app/orders/[id]/page.tsx`

- [ ] **Step 1: Apply heading and panel card changes**

Page heading:
```tsx
// Before
<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">

// After
<h1 className="font-display text-2xl font-bold text-stone-900 dark:text-stone-100">
```

Standard panels — remove border, add shadow (apply to timeline, actions, items, and shipping panels):
```tsx
// Before (pattern applied to all standard panels)
className="... rounded-lg border p-4 dark:border-stone-700 ..."
// e.g.  "mb-8 rounded-lg border p-6 dark:border-stone-700"
//       "mb-6 rounded-lg border p-4 dark:border-stone-700"
//       "mt-4 rounded-lg border p-4 dark:border-stone-700"

// After (add bg-white and shadow-sm, drop border and dark:border)
className="... rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-800 ..."
// e.g.  "mb-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-stone-800"
//       "mb-6 rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-800"
//       "mt-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-800"
```

Payment panel — keep amber tint, only update radius:
```tsx
// Before
<div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-900/20">

// After
<div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-900/20">
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: Compiled successfully, no TypeScript errors

---

### Task 6: Admin dashboard + KPICards + RecentOrdersTable

**Files:**
- Modify: `src/app/admin/page.tsx`
- Modify: `src/components/admin/KPICards.tsx`
- Modify: `src/components/admin/RecentOrdersTable.tsx`

- [ ] **Step 1: Apply heading and card radius changes**

`src/app/admin/page.tsx` — heading (inside border-b section):
```tsx
// Before
<h1 className="text-2xl font-extrabold tracking-tight text-stone-900">

// After
<h1 className="font-display text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
```

`src/app/admin/page.tsx` — low-stock alert card:
```tsx
// Before
<div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-900/20">

// After
<div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-900/20">
```

`src/components/admin/KPICards.tsx` — increase card radius:
```tsx
// Before
className={`rounded-xl bg-white p-4 shadow-sm dark:bg-stone-800 ${accentBorder[accent]}`}

// After
className={`rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-800 ${accentBorder[accent]}`}
```

`src/components/admin/RecentOrdersTable.tsx` — wrapper radius + title font:
```tsx
// Before (wrapper)
<div className="rounded-xl bg-white shadow-sm dark:bg-stone-800">
// Before (h3 title inside header div)
<h3 className="font-medium text-stone-900 dark:text-stone-100">

// After
<div className="rounded-2xl bg-white shadow-sm dark:bg-stone-800">
<h3 className="font-display font-semibold text-stone-900 dark:text-stone-100">
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: Compiled successfully, no TypeScript errors

---

### Task 7: Admin orders page + admin products page

**Files:**
- Modify: `src/app/admin/orders/page.tsx`
- Modify: `src/app/admin/products/page.tsx`

- [ ] **Step 1: Apply heading, card, and table wrapper changes**

`src/app/admin/orders/page.tsx` — heading + divider:
```tsx
// Before
<h1 className="mb-4 text-2xl font-bold text-gray-900">

// After
<h1 className="font-display mb-3 text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
```
Add after h1:
```tsx
<div className="mb-6 h-0.5 w-8 rounded-full bg-amber-400" />
```

`src/app/admin/orders/page.tsx` — each inline order card:
```tsx
// Before
<div className="rounded-lg border bg-white p-4">

// After
<div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-800">
```

`src/app/admin/products/page.tsx` — main list heading + divider:
```tsx
// Before
<h1 className="text-2xl font-bold text-gray-900">{t("admin.products")}</h1>

// After
<h1 className="font-display text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
  {t("admin.products")}
</h1>
```
Add after h1 (inside the `flex items-center justify-between` div, after the h1):
```tsx
<div className="mt-1 h-0.5 w-8 rounded-full bg-amber-400" />
```

`src/app/admin/products/page.tsx` — editing/creating view heading (separate early-return at line 177):
```tsx
// Before
<h1 className="mb-4 text-2xl font-bold text-gray-900">
  {editing ? t("admin.editProduct") : t("admin.newProduct")}
</h1>

// After
<h1 className="font-display mb-3 text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
  {editing ? t("admin.editProduct") : t("admin.newProduct")}
</h1>
<div className="mb-6 h-0.5 w-8 rounded-full bg-amber-400" />
```

`src/app/admin/products/page.tsx` — desktop table wrapper:
```tsx
// Before
<div className="hidden rounded-lg border bg-white md:block">

// After
<div className="hidden rounded-2xl bg-white shadow-sm dark:bg-stone-800 md:block">
```

`src/app/admin/products/page.tsx` — mobile product cards:
```tsx
// Before
<div className="rounded-lg border bg-white p-4">

// After
<div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-800">
```

`src/app/admin/products/page.tsx` — bulk actions bar:
```tsx
// Before
<div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">

// After
<div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3">
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: Compiled successfully, no TypeScript errors

---

### Task 8: Admin settings page + ProductForm

**Files:**
- Modify: `src/app/admin/settings/page.tsx`
- Modify: `src/components/admin/ProductForm.tsx`

- [ ] **Step 1: Apply heading and card changes**

`src/app/admin/settings/page.tsx` — heading + divider:
```tsx
// Before
<h1 className="mb-6 text-2xl font-bold text-gray-900">

// After
<h1 className="font-display mb-3 text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
```
Add after h1:
```tsx
<div className="mb-8 h-0.5 w-8 rounded-full bg-amber-400" />
```

`src/app/admin/settings/page.tsx` — settings card:
```tsx
// Before
<div className="rounded-lg border bg-white p-6">

// After
<div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-stone-800">
```

`src/app/admin/settings/page.tsx` — active discount indicator:
```tsx
// Before
<div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">

// After
<div className="mt-4 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
```

`src/components/admin/ProductForm.tsx` — form wrapper card:
```tsx
// Before
<div className="space-y-4 rounded-lg border bg-white p-6 dark:border-stone-700 dark:bg-stone-800">

// After
<div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-stone-800">
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: Compiled successfully, no TypeScript errors
