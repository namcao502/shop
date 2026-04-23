# Code Quality & Test Coverage Fix Plan

> **For agentic workers:** Use s3-implement to execute this plan task-by-task.

**Goal:** Fix all Critical/High/Medium non-MoMo issues from the April 2026 code review and establish a Vitest unit test suite.

**Architecture:** Fixes span four areas: (1) test infrastructure -- add Vitest, write unit tests for pure utilities; (2) UI correctness -- dark mode gaps in NotificationBell and all admin components; (3) code quality -- refactor the 414-line order PATCH handler, fix error handling and console.error; (4) feature gaps -- Zod on VietQR route, phone validation, Vietnamese slug, localized timestamps, low-stock alert, Firestore index.

**Tech Stack:** Vitest 3.x, happy-dom, Next.js 16, Zod 4, Tailwind CSS, Firebase Admin SDK

---

## Task 1: Set up Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install dependencies**
```bash
npm install --save-dev vitest @vitest/coverage-v8 happy-dom
```

- [ ] **Step 2: Create vitest.config.ts**
```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/firebase/**", "src/lib/i18n/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Add scripts to package.json**
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 4: Run -- expect "no test files found" (0 failures)**
```bash
npm test
```

---

## Task 2: Unit tests for pricing.ts

**Files:**
- Create: `src/lib/__tests__/pricing.test.ts`

- [ ] **Step 1: Write tests**
```ts
import { describe, it, expect } from "vitest";
import { calculateEffectivePrice, discountPercent } from "@/lib/pricing";

describe("calculateEffectivePrice", () => {
  const product = { price: 100_000, discountPrice: undefined };

  it("returns price when no discount", () => {
    expect(calculateEffectivePrice(product)).toBe(100_000);
  });

  it("returns discountPrice when lower than price and no site-wide", () => {
    expect(
      calculateEffectivePrice({ price: 100_000, discountPrice: 80_000 })
    ).toBe(80_000);
  });

  it("ignores discountPrice when site-wide discount is active", () => {
    expect(
      calculateEffectivePrice(
        { price: 100_000, discountPrice: 80_000 },
        { active: true, value: 10 }
      )
    ).toBe(90_000);
  });

  it("ignores site-wide discount when not active", () => {
    expect(
      calculateEffectivePrice({ price: 100_000 }, { active: false, value: 20 })
    ).toBe(100_000);
  });

  it("floors fractional results", () => {
    expect(
      calculateEffectivePrice({ price: 99_999 }, { active: true, value: 10 })
    ).toBe(89_999);
  });

  it("ignores discountPrice >= price", () => {
    expect(
      calculateEffectivePrice({ price: 100_000, discountPrice: 100_000 })
    ).toBe(100_000);
  });
});

describe("discountPercent", () => {
  it("calculates percent off correctly", () => {
    expect(discountPercent(100_000, 80_000)).toBe(20);
  });

  it("rounds to nearest integer", () => {
    expect(discountPercent(100_000, 66_667)).toBe(33);
  });
});
```

- [ ] **Step 2: Run -- expect PASS**
```bash
npm test src/lib/__tests__/pricing.test.ts
```

---

## Task 3: Unit tests for shipping.ts

**Files:**
- Create: `src/lib/__tests__/shipping.test.ts`

- [ ] **Step 1: Write tests**
```ts
import { describe, it, expect } from "vitest";
import { calculateShippingFee } from "@/lib/shipping";

describe("calculateShippingFee", () => {
  it("returns 0 when subtotal >= 500,000", () => {
    expect(calculateShippingFee("79", 500_000)).toBe(0);
    expect(calculateShippingFee("48", 1_000_000)).toBe(0);
  });

  it("returns 20,000 for HCM (79)", () => {
    expect(calculateShippingFee("79", 100_000)).toBe(20_000);
  });

  it("returns 20,000 for Hanoi (01)", () => {
    expect(calculateShippingFee("01", 100_000)).toBe(20_000);
  });

  it("returns 35,000 for other provinces", () => {
    expect(calculateShippingFee("48", 100_000)).toBe(35_000);
    expect(calculateShippingFee("92", 0)).toBe(35_000);
  });

  it("returns 0 for HCM when subtotal is exactly at threshold", () => {
    expect(calculateShippingFee("79", 499_999)).toBe(20_000);
    expect(calculateShippingFee("79", 500_000)).toBe(0);
  });
});
```

- [ ] **Step 2: Run -- expect PASS**
```bash
npm test src/lib/__tests__/shipping.test.ts
```

---

## Task 4: Fix phone validation and add tests

Phone regex `/^\+?[\d\s\-(). ]{7,20}$/` is too loose -- it accepts `1234567` (not a valid Vietnamese number). Vietnamese numbers must be exactly 10 digits starting with `0`, or international format `+84` followed by 9 digits.

**Files:**
- Modify: `src/lib/validation.ts`
- Create: `src/lib/__tests__/validation.test.ts`

- [ ] **Step 1: Write tests that expose the bug**
```ts
import { describe, it, expect } from "vitest";
import { shippingAddressSchema } from "@/lib/validation";

const valid = {
  name: "Nguyen Van A",
  phone: "0901234567",
  address: "123 Nguyen Hue",
  ward: "Ben Nghe",
  province: "79",
};

describe("shippingAddressSchema phone", () => {
  it("accepts standard 10-digit Vietnamese number", () => {
    expect(shippingAddressSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts +84 international format", () => {
    const r = shippingAddressSchema.safeParse({ ...valid, phone: "+84901234567" });
    expect(r.success).toBe(true);
  });

  it("rejects 7-digit number (too short for Vietnam)", () => {
    const r = shippingAddressSchema.safeParse({ ...valid, phone: "1234567" });
    expect(r.success).toBe(false);
  });

  it("rejects letters", () => {
    const r = shippingAddressSchema.safeParse({ ...valid, phone: "090abc1234" });
    expect(r.success).toBe(false);
  });

  it("rejects number not starting with 0 or +84", () => {
    const r = shippingAddressSchema.safeParse({ ...valid, phone: "1901234567" });
    expect(r.success).toBe(false);
  });
});

describe("shippingAddressSchema other fields", () => {
  it("rejects name shorter than 2 chars", () => {
    expect(shippingAddressSchema.safeParse({ ...valid, name: "A" }).success).toBe(false);
  });

  it("rejects address shorter than 5 chars", () => {
    expect(shippingAddressSchema.safeParse({ ...valid, address: "abc" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run -- expect FAIL** (rejects 7-digit test passes, not-starting-with-0 test fails)
```bash
npm test src/lib/__tests__/validation.test.ts
```
Expected: FAIL -- `1234567` currently passes the loose regex.

- [ ] **Step 3: Fix validation.ts**
```ts
// src/lib/validation.ts
import { z } from "zod";
import type { ShippingAddress } from "@/lib/types";

// Accepts: 0xxxxxxxxx (10 digits) or +84xxxxxxxxx (12 chars with country code)
const vnPhoneRegex = /^(?:0[0-9]{9}|\+84[0-9]{9})$/;

export const shippingAddressSchema = z.object({
  name: z.string().min(2),
  phone: z
    .string()
    .regex(vnPhoneRegex, "Enter a valid Vietnamese phone number (e.g. 0901234567)"),
  address: z.string().min(5),
  ward: z.string().min(1),
  province: z.string().min(1),
});

export function parseShippingErrors(
  error: z.ZodError
): Partial<Record<keyof ShippingAddress, string>> {
  const result: Partial<Record<keyof ShippingAddress, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof ShippingAddress;
    if (!result[field]) {
      result[field] = issue.message;
    }
  }
  return result;
}
```

- [ ] **Step 4: Run -- expect PASS**
```bash
npm test src/lib/__tests__/validation.test.ts
```

---

## Task 5: Add Zod validation to VietQR route

**Files:**
- Modify: `src/app/api/vietqr/route.ts`

- [ ] **Step 1: Add Zod schema and replace raw body access**

Replace lines 12-20 in `src/app/api/vietqr/route.ts`:
```ts
// src/app/api/vietqr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAuth } from "@/lib/verify-admin";
import { z } from "zod";

const bodySchema = z.object({
  orderId: z.string().min(1),
  orderCode: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { orderId, orderCode } = parsed.data;

  try {
    const orderSnap = await adminDb.collection("orders").doc(orderId).get();
    if (!orderSnap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = orderSnap.data()!;

    if (orderData.userId !== authResult.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (orderData.orderCode !== orderCode) {
      return NextResponse.json({ error: "Order code mismatch" }, { status: 400 });
    }

    const amount: unknown = orderData.totalAmount;
    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid order amount" }, { status: 500 });
    }

    const bankId = process.env.VIETQR_BANK_ID;
    const accountNumber = process.env.VIETQR_ACCOUNT_NUMBER;
    const accountName = process.env.VIETQR_ACCOUNT_NAME;

    if (!bankId || !accountNumber) {
      return NextResponse.json({ error: "Payment configuration error" }, { status: 500 });
    }

    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(orderCode)}&accountName=${encodeURIComponent(accountName ?? "")}`;

    return NextResponse.json({ qrUrl, orderCode, amount });
  } catch {
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Run build -- expect PASS**
```bash
npm run build
```

---

## Task 6: Fix unsafe error narrowing in DELETE handler

**Files:**
- Modify: `src/app/api/orders/[id]/route.ts` (lines 405-410)

The current code uses unsafe cast `err as Error & { status?: number }`. Replace with proper narrowing.

- [ ] **Step 1: Replace the catch block in DELETE handler**

```ts
// Replace lines 405-410:
} catch (err: unknown) {
  if (err instanceof Error) {
    const status = (err as Error & { status?: number }).status ?? 400;
    return NextResponse.json({ error: err.message }, { status });
  }
  return NextResponse.json({ error: "Failed to delete order" }, { status: 400 });
}
```

- [ ] **Step 2: Run build -- expect PASS**
```bash
npm run build
```

---

## Task 7: Remove console.error from notifications.ts

`console.error` in production code violates the coding standards. Fire-and-forget failures in `writeNotification` should fail silently.

**Files:**
- Modify: `src/lib/notifications.ts`

- [ ] **Step 1: Remove the console.error**

Replace lines 33-35:
```ts
// Before:
ref.set(payload).catch((err: unknown) => {
  console.error("writeNotification failed", err);
});

// After:
ref.set(payload).catch(() => {
  // fire-and-forget: notification write failures are non-fatal
});
```

- [ ] **Step 2: Run build -- expect PASS**
```bash
npm run build
```

---

## Task 8: Fix cart badge cap (9+ -> 99+)

**Files:**
- Modify: `src/components/layout/Header.tsx`

The badge shows "9+" for any cart with 10+ items. This is misleading -- change threshold to 99.

- [ ] **Step 1: Fix NotificationBell.tsx line 80**

`Header.tsx` cart badges render `{totalItems}` directly with no cap and need no change. Only `NotificationBell.tsx` has the cap pattern:
```ts
// Before:
{unreadCount > 9 ? "9+" : unreadCount}
// After:
{unreadCount > 99 ? "99+" : unreadCount}
```

- [ ] **Step 2: Run build -- expect PASS**
```bash
npm run build
```

---

## Task 9: Extract AUTH_TIMEOUT_MS to shared constants

**Files:**
- Create: `src/lib/constants.ts`
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Create constants file**
```ts
// src/lib/constants.ts
export const AUTH_TIMEOUT_MS = 5_000;
```

- [ ] **Step 2: Update admin layout import**

In `src/app/admin/layout.tsx`, replace:
```ts
const AUTH_TIMEOUT_MS = 5000;
```
with:
```ts
import { AUTH_TIMEOUT_MS } from "@/lib/constants";
```

- [ ] **Step 3: Run build -- expect PASS**
```bash
npm run build
```

---

## Task 10: Add missing Firestore compound index

The `read-all` API route queries `.where("userId", "==", uid).where("read", "==", false)`. This compound query requires a composite index not present in `firestore.indexes.json`.

**Files:**
- Modify: `firestore.indexes.json`

- [ ] **Step 1: Add the composite index**

Add to the `indexes` array in `firestore.indexes.json`:
```json
{
  "collectionGroup": "notifications",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "userId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "read",
      "order": "ASCENDING"
    }
  ]
}
```

- [ ] **Step 2: Deploy indexes**
```bash
firebase deploy --only firestore:indexes
```

---

## Task 11: Fix dark mode in NotificationBell

**Files:**
- Modify: `src/components/layout/NotificationBell.tsx`

- [ ] **Step 1: Fix popup container and header (line 87-99)**

```tsx
// Line 87 -- popup wrapper:
// Before:
<div className="absolute right-0 top-10 z-50 w-80 rounded-lg border border-stone-200 bg-white shadow-xl">
// After:
<div className="absolute right-0 top-10 z-50 w-80 rounded-lg border border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-800">

// Line 89 -- header border:
// Before:
<div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
// After:
<div className="flex items-center justify-between border-b border-stone-100 px-4 py-3 dark:border-stone-700">

// Line 90 -- header text:
// Before:
<span className="text-sm font-bold text-stone-900">{t("notification.title")}</span>
// After:
<span className="text-sm font-bold text-stone-900 dark:text-stone-100">{t("notification.title")}</span>
```

- [ ] **Step 2: Fix notification list items (lines 103-128)**

```tsx
// Line 103 -- empty state text (already uses text-stone-400, fine):
// No change needed.

// Line 111 -- item wrapper:
// Before:
className={`border-b border-stone-100 px-4 py-3 last:border-0 ${
  !n.read
    ? "border-l-2 theme-accent-border bg-stone-50"
    : "opacity-70"
}`}
// After:
className={`border-b border-stone-100 px-4 py-3 last:border-0 dark:border-stone-700 ${
  !n.read
    ? "border-l-2 theme-accent-border bg-stone-50 dark:bg-stone-700/40"
    : "opacity-70"
}`}

// Line 122 -- title text:
// Before:
<span className="text-xs font-bold text-stone-900">{title}</span>
// After:
<span className="text-xs font-bold text-stone-900 dark:text-stone-100">{title}</span>
```

- [ ] **Step 3: Run build -- expect PASS**
```bash
npm run build
```

---

## Task 12: Fix dark mode in admin components

**Files:**
- Modify: `src/components/admin/KPICards.tsx`
- Modify: `src/components/admin/RecentOrdersTable.tsx`
- Modify: `src/components/admin/StatusBreakdown.tsx`
- Modify: `src/components/admin/TopProducts.tsx`

- [ ] **Step 1: KPICards.tsx**

```tsx
// Line 34 -- card wrapper:
// Before:
className={`rounded-xl bg-white p-4 shadow-sm ${accentBorder[accent]}`}
// After:
className={`rounded-xl bg-white p-4 shadow-sm dark:bg-stone-800 ${accentBorder[accent]}`}

// Line 36 -- label:
// Before:
<p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
// After:  (text-stone-400 is already readable in dark mode, no change)

// Line 39 -- value text -- valueColour uses text-stone-900, fix that map:
// Before:
const valueColour: Record<KPIAccent, string> = {
  primary: "text-stone-900",
  warning: "text-amber-600",
  neutral: "text-stone-900",
};
// After:
const valueColour: Record<KPIAccent, string> = {
  primary: "text-stone-900 dark:text-stone-100",
  warning: "text-amber-600",
  neutral: "text-stone-900 dark:text-stone-100",
};
```

- [ ] **Step 2: RecentOrdersTable.tsx**

```tsx
// Line 19 -- table card:
// Before:
<div className="rounded-xl bg-white shadow-sm">
// After:
<div className="rounded-xl bg-white shadow-sm dark:bg-stone-800">

// Line 20 -- header border + text:
// Before:
<div className="border-b border-stone-100 px-4 py-3">
  <h3 className="font-medium text-stone-900">{t("admin.recentOrders")}</h3>
// After:
<div className="border-b border-stone-100 px-4 py-3 dark:border-stone-700">
  <h3 className="font-medium text-stone-900 dark:text-stone-100">{t("admin.recentOrders")}</h3>

// Line 25 -- thead text (text-stone-500 fine; border-b fix):
// Before:
<tr className="border-b text-left text-xs uppercase text-stone-500">
// After:
<tr className="border-b text-left text-xs uppercase text-stone-500 dark:border-stone-700">

// Line 35 -- tbody rows:
// Before:
<tr key={order.id} className="border-b last:border-0">
// After:
<tr key={order.id} className="border-b last:border-0 dark:border-stone-700">

// Line 44 -- amount cell:
// Before:
<td className="px-4 py-2">{formatPrice(order.totalAmount, fmtLocale)}</td>
// After:
<td className="px-4 py-2 text-stone-700 dark:text-stone-300">{formatPrice(order.totalAmount, fmtLocale)}</td>
```

- [ ] **Step 3: StatusBreakdown.tsx**

```tsx
// Line 25 -- wrapper:
// Before:
<div className="rounded-xl bg-white p-4 shadow-sm">
// After:
<div className="rounded-xl bg-white p-4 shadow-sm dark:bg-stone-800">

// Line 26 -- heading:
// Before:
<h3 className="mb-3 font-medium text-stone-900">{t("admin.orderStatus")}</h3>
// After:
<h3 className="mb-3 font-medium text-stone-900 dark:text-stone-100">{t("admin.orderStatus")}</h3>

// Line 29 -- status pill:
// Before:
<div key={status} className="rounded-lg border border-stone-100 px-3 py-2 text-sm">
// After:
<div key={status} className="rounded-lg border border-stone-100 px-3 py-2 text-sm dark:border-stone-700">

// Line 30 -- label:
// Before:
<span className="text-stone-500">
// After:
<span className="text-stone-500 dark:text-stone-400">
```

- [ ] **Step 4: TopProducts.tsx**

```tsx
// Line 19 -- wrapper:
// Before:
<div className="rounded-xl bg-white p-4 shadow-sm">
// After:
<div className="rounded-xl bg-white p-4 shadow-sm dark:bg-stone-800">

// Line 20 -- heading:
// Before:
<h3 className="mb-3 font-medium text-stone-900">{t("admin.topSelling")}</h3>
// After:
<h3 className="mb-3 font-medium text-stone-900 dark:text-stone-100">{t("admin.topSelling")}</h3>

// Line 24 -- product name:
// Before:
<span className="text-sm text-stone-700">{p.name}</span>
// After:
<span className="text-sm text-stone-700 dark:text-stone-300">{p.name}</span>

// Line 27 -- progress bar track:
// Before:
<div className="h-1.5 w-20 overflow-hidden rounded-full bg-stone-200">
// After:
<div className="h-1.5 w-20 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
```

- [ ] **Step 5: Run build -- expect PASS**
```bash
npm run build
```

---

## Task 13: Fix dark mode in ProductForm

**Files:**
- Modify: `src/components/admin/ProductForm.tsx`

Read the full file first to identify all `bg-white`, `text-stone-900`, `border-stone-*`, `text-gray-*` classes that lack dark variants.

- [ ] **Step 1: Fix form card wrapper (line 108)**

```tsx
// Before:
<div className="space-y-4 rounded-lg border bg-white p-6">
// After:
<div className="space-y-4 rounded-lg border bg-white p-6 dark:border-stone-700 dark:bg-stone-800">
```

- [ ] **Step 2: Fix textarea and select elements**

```tsx
// Description textarea (line ~132):
// Before:
className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
// After:
className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"

// Label text (text-gray-700 on line ~128):
// Before:
<label className="text-sm font-medium text-gray-700">
// After:
<label className="text-sm font-medium text-gray-700 dark:text-stone-300">

// Category select element -- find className with border-gray-300 on a <select>:
// Add: dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100
```

- [ ] **Step 3: Run build -- expect PASS**
```bash
npm run build
```

---

## Task 14: Localize relative timestamps in NotificationBell

The `formatRelative` function returns hardcoded English strings. Localize using the existing `useLocale` hook.

**Files:**
- Modify: `src/lib/i18n/translations.ts`
- Modify: `src/lib/i18n/en.ts`
- Modify: `src/lib/i18n/vi.ts`
- Modify: `src/components/layout/NotificationBell.tsx`

- [ ] **Step 1: Add translation keys to translations.ts**

In `src/lib/i18n/translations.ts`, add to the `TranslationKey` union:
```ts
| "notification.timeJustNow"
| "notification.timeMinutesAgo"
| "notification.timeHoursAgo"
| "notification.timeDaysAgo"
```

- [ ] **Step 2: Add English strings to en.ts**
```ts
"notification.timeJustNow": "just now",
"notification.timeMinutesAgo": "{n}m ago",
"notification.timeHoursAgo": "{n}h ago",
"notification.timeDaysAgo": "{n}d ago",
```

- [ ] **Step 3: Add Vietnamese strings to vi.ts**
```ts
"notification.timeJustNow": "vừa xong",
"notification.timeMinutesAgo": "{n} phút trước",
"notification.timeHoursAgo": "{n} giờ trước",
"notification.timeDaysAgo": "{n} ngày trước",
```

- [ ] **Step 4: Update formatRelative in NotificationBell.tsx**

Replace the `formatRelative` function at module level (lines 12-21) with:
```tsx
// At module level, replacing the old formatRelative function:

function formatRelativeLocalized(date: Date, t: (key: TranslationKey) => string): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t("notification.timeJustNow");
  if (mins < 60) return t("notification.timeMinutesAgo").replace("{n}", String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("notification.timeHoursAgo").replace("{n}", String(hours));
  const days = Math.floor(hours / 24);
  return t("notification.timeDaysAgo").replace("{n}", String(days));
}
```

Update the call site (line 123):
```tsx
// Before:
{formatRelative(n.createdAt)}
// After:
{formatRelativeLocalized(n.createdAt, t)}
```

- [ ] **Step 5: Run build -- expect PASS**
```bash
npm run build
```

---

## Task 15: Fix Vietnamese slug generation in ProductForm

The current regex strips all non-ASCII characters, turning "Qua Luu Niem" into "qu-lu-nim". Use Unicode normalization to decompose accented characters before stripping.

**Files:**
- Modify: `src/components/admin/ProductForm.tsx`

- [ ] **Step 1: Write unit test for slug logic**

Create `src/lib/__tests__/slug.test.ts`:
```ts
import { describe, it, expect } from "vitest";

// Mirror the slug function from ProductForm for testing
function toSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\u0111/g, "d") // d with stroke (d)
    .replace(/\u0110/g, "D") // D with stroke
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

describe("toSlug", () => {
  it("handles plain ASCII", () => {
    expect(toSlug("Hello World")).toBe("hello-world");
  });

  it("strips Vietnamese diacritics correctly", () => {
    expect(toSlug("Quà Lưu Niệm")).toBe("qua-luu-niem");
  });

  it("handles d-with-stroke", () => {
    expect(toSlug("Đồ uống")).toBe("do-uong");
  });

  it("collapses multiple separators", () => {
    expect(toSlug("hello   world")).toBe("hello-world");
  });

  it("strips leading and trailing hyphens", () => {
    expect(toSlug("-hello-")).toBe("hello");
  });
});
```

- [ ] **Step 2: Run -- expect FAIL** (current slug function does not handle diacritics)
```bash
npm test src/lib/__tests__/slug.test.ts
```

- [ ] **Step 3: Replace handleNameChange in ProductForm.tsx**

```tsx
const handleNameChange = (value: string) => {
  setName(value);
  if (!product) {
    setSlug(
      value
        .normalize("NFKD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/\u0111/g, "d")
        .replace(/\u0110/g, "D")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    );
  }
};
```

Update the test's `toSlug` function to match the new implementation (same code), then:

- [ ] **Step 4: Run -- expect PASS**
```bash
npm test src/lib/__tests__/slug.test.ts
```

- [ ] **Step 5: Run build**
```bash
npm run build
```

---

## Task 16: Refactor order PATCH handler into action helpers

The PATCH handler is 330 lines with 5 inline Firestore transactions. Extract each action into a named async function so the main handler is a thin dispatcher.

**Files:**
- Modify: `src/lib/verify-admin.ts`
- Modify: `src/app/api/orders/[id]/route.ts`

- [ ] **Step 0: Export `VerifyResult` from verify-admin.ts**

`VerifyResult` is currently a non-exported interface. The extracted functions need it as a parameter type.

In `src/lib/verify-admin.ts`, change line 4:
```ts
// Before:
interface VerifyResult {
// After:
export interface VerifyResult {
```

- [ ] **Step 1: Extract action handlers above the PATCH export**

Add these functions before the `export async function PATCH` line. Each receives `(orderRef, order, id, authResult, body?)` and returns `void` or throws.

```ts
import type { DocumentReference, Transaction } from "firebase-admin/firestore";
import type { VerifyResult } from "@/lib/verify-admin";

async function handleCancel(
  orderRef: DocumentReference,
  order: FirebaseFirestore.DocumentData,
  id: string,
  authResult: VerifyResult
): Promise<void> {
  if (order.orderStatus !== "pending") {
    throw httpError("Only pending orders can be cancelled", 400);
  }

  await adminDb.runTransaction(async (tx: Transaction) => {
    const freshSnap = await tx.get(orderRef);
    if (!freshSnap.exists || freshSnap.data()!.orderStatus !== "pending") {
      throw new Error("Order is no longer cancellable");
    }
    const freshItems = freshSnap.data()!.items as Array<{ productId: string; qty: number }>;
    const productRefs = freshItems.map((item) =>
      adminDb.collection("products").doc(item.productId)
    );
    const productSnaps = await Promise.all(
      productRefs.map((ref) => tx.get(ref))
    );
    for (let i = 0; i < freshItems.length; i++) {
      if (productSnaps[i].exists) {
        const currentStock = productSnaps[i].data()!.stock ?? 0;
        tx.update(productRefs[i], { stock: currentStock + freshItems[i].qty });
      }
    }
    tx.update(orderRef, {
      orderStatus: "cancelled",
      updatedAt: FieldValue.serverTimestamp(),
    });
    writeNotification(
      {
        userId: order.userId as string,
        type: "order_cancelled",
        title: `Order ${order.orderCode} cancelled`,
        message: authResult.isAdmin
          ? "Your order has been cancelled by the store."
          : "Your cancellation request has been processed.",
        orderId: id,
        orderCode: order.orderCode as string,
      },
      tx
    );
    if (!authResult.isAdmin) {
      writeNotification(
        {
          userId: "admin",
          type: "cancel_requested",
          title: `Order ${order.orderCode} cancelled by customer`,
          message: `Customer cancelled order ${order.orderCode}.`,
          orderId: id,
          orderCode: order.orderCode as string,
        },
        tx
      );
    }
  });
}

async function handleUpdateAddress(
  orderRef: DocumentReference,
  order: FirebaseFirestore.DocumentData,
  id: string,
  authResult: VerifyResult,
  shippingAddress: z.infer<typeof shippingAddressSchema>
): Promise<void> {
  if (!["pending", "confirmed"].includes(order.orderStatus as string)) {
    throw httpError("Address can only be updated for pending or confirmed orders", 400);
  }
  await adminDb.runTransaction(async (tx: Transaction) => {
    const freshSnap = await tx.get(orderRef);
    if (!freshSnap.exists) throw new Error("Order not found");
    if (!["pending", "confirmed"].includes(freshSnap.data()!.orderStatus)) {
      throw new Error("Address can only be updated for pending or confirmed orders");
    }
    const freshOrder = freshSnap.data()!;
    const newProvince = shippingAddress.province;
    const oldProvince = (freshOrder.shippingAddress as { province?: string })?.province;
    const updatePayload: Record<string, unknown> = {
      shippingAddress,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (newProvince !== oldProvince) {
      const subtotal = typeof freshOrder.subtotal === "number" ? freshOrder.subtotal : 0;
      const newShippingFee = calculateShippingFee(newProvince, subtotal);
      updatePayload.shippingFee = newShippingFee;
      updatePayload.totalAmount = subtotal + newShippingFee;
    }
    tx.update(orderRef, updatePayload);
    if (authResult.isAdmin) {
      writeNotification(
        {
          userId: order.userId as string,
          type: "address_updated",
          title: `Shipping address updated for ${order.orderCode}`,
          message: "The store has updated your shipping address.",
          orderId: id,
          orderCode: order.orderCode as string,
        },
        tx
      );
    } else {
      writeNotification(
        {
          userId: "admin",
          type: "address_update_requested",
          title: `Address update for ${order.orderCode}`,
          message: `Customer updated shipping address on order ${order.orderCode}.`,
          orderId: id,
          orderCode: order.orderCode as string,
        },
        tx
      );
    }
  });
}

async function handleConfirmPayment(
  orderRef: DocumentReference,
  order: FirebaseFirestore.DocumentData,
  id: string
): Promise<void> {
  if (order.paymentMethod === "momo" && order.paymentStatus === "failed") {
    throw httpError("Cannot manually confirm a failed MoMo payment", 400);
  }
  if (order.paymentStatus === "paid") {
    throw httpError("Payment already confirmed", 400);
  }
  if (["cancelled", "delivered"].includes(order.orderStatus as string)) {
    throw httpError("Cannot confirm payment for a cancelled or delivered order", 400);
  }
  await adminDb.runTransaction(async (tx: Transaction) => {
    const freshSnap = await tx.get(orderRef);
    if (!freshSnap.exists) throw new Error("Order not found");
    if (freshSnap.data()!.paymentStatus === "paid") throw new Error("Payment already confirmed");
    if (["cancelled", "delivered"].includes(freshSnap.data()!.orderStatus)) {
      throw new Error("Cannot confirm payment for a cancelled or delivered order");
    }
    tx.update(orderRef, {
      paymentStatus: "paid",
      orderStatus: "confirmed",
      updatedAt: FieldValue.serverTimestamp(),
    });
    writeNotification(
      {
        userId: order.userId as string,
        type: "payment_confirmed",
        title: `Payment confirmed for ${order.orderCode}`,
        message: "Your payment has been verified. Your order is being prepared.",
        orderId: id,
        orderCode: order.orderCode as string,
      },
      tx
    );
  });
}

async function handleShip(
  orderRef: DocumentReference,
  order: FirebaseFirestore.DocumentData,
  id: string
): Promise<void> {
  if (order.orderStatus !== "confirmed") {
    throw httpError("Only confirmed orders can be marked as shipping", 400);
  }
  await adminDb.runTransaction(async (tx: Transaction) => {
    const freshSnap = await tx.get(orderRef);
    if (!freshSnap.exists) throw new Error("Order not found");
    if (freshSnap.data()!.orderStatus !== "confirmed") {
      throw new Error("Only confirmed orders can be marked as shipping");
    }
    tx.update(orderRef, {
      orderStatus: "shipping",
      updatedAt: FieldValue.serverTimestamp(),
    });
    writeNotification(
      {
        userId: order.userId as string,
        type: "order_shipped",
        title: `Order ${order.orderCode} is on its way`,
        message: "Your package has been shipped and is on its way to you.",
        orderId: id,
        orderCode: order.orderCode as string,
      },
      tx
    );
  });
}

async function handleDeliver(
  orderRef: DocumentReference,
  order: FirebaseFirestore.DocumentData,
  id: string
): Promise<void> {
  if (order.orderStatus !== "shipping") {
    throw httpError("Only shipping orders can be marked as delivered", 400);
  }
  await adminDb.runTransaction(async (tx: Transaction) => {
    const freshSnap = await tx.get(orderRef);
    if (!freshSnap.exists) throw new Error("Order not found");
    if (freshSnap.data()!.orderStatus !== "shipping") {
      throw new Error("Only shipping orders can be marked as delivered");
    }
    tx.update(orderRef, {
      orderStatus: "delivered",
      updatedAt: FieldValue.serverTimestamp(),
    });
    writeNotification(
      {
        userId: order.userId as string,
        type: "order_delivered",
        title: `Order ${order.orderCode} delivered`,
        message: "Your order has been delivered. Thank you for shopping with us!",
        orderId: id,
        orderCode: order.orderCode as string,
      },
      tx
    );
  });
}
```

- [ ] **Step 2: Replace PATCH body with a thin dispatcher**

```ts
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsedBody = patchBodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Invalid action" },
      { status: 400 }
    );
  }

  const body = parsedBody.data;

  if (ADMIN_ONLY_ACTIONS.includes(body.action as AdminAction) && !authResult.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orderRef = adminDb.collection("orders").doc(id);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const order = orderSnap.data()!;
  const isOwner = order.userId === authResult.uid;
  if (!isOwner && !authResult.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    if (body.action === "cancel") await handleCancel(orderRef, order, id, authResult);
    else if (body.action === "update_address") await handleUpdateAddress(orderRef, order, id, authResult, body.shippingAddress);
    else if (body.action === "confirm_payment") await handleConfirmPayment(orderRef, order, id);
    else if (body.action === "ship") await handleShip(orderRef, order, id);
    else if (body.action === "deliver") await handleDeliver(orderRef, order, id);
    else return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    if (err instanceof Error) {
      const status = (err as Error & { status?: number }).status ?? 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Remove old inline if-blocks and run build**
```bash
npm run build
```

---

## Task 17: Add low-stock alert to admin dashboard

Show a warning banner on the admin dashboard when any product has stock <= 5. Query done client-side (same pattern as other dashboard reads).

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Add low-stock query to the dashboard page**

First, expand the existing imports in `src/app/admin/page.tsx`:
```ts
// firebase/firestore import -- add `where`:
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";

// @/lib/types import -- add `Product`:
import type { Order, OrderStatus, Product } from "@/lib/types";
```

Add state above the existing `useEffect`:
```ts
const [lowStockProducts, setLowStockProducts] = useState<Array<{ id: string; name: string; stock: number }>>([]);
```

Inside the existing `fetchData` async function (after `setOrders`), add:
```ts
const lowStockSnap = await getDocs(
  query(
    collection(db, "products"),
    where("isPublished", "==", true),
    where("stock", "<=", 5)
  )
);
const lowStock = lowStockSnap.docs.map((d) => {
  const data = d.data() as Product;
  return { id: d.id, name: data.name, stock: data.stock };
});
setLowStockProducts(lowStock);
```

- [ ] **Step 2: Render the alert banner above KPI cards**

```tsx
{lowStockProducts.length > 0 && (
  <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-900/20">
    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
      {lowStockProducts.length} product{lowStockProducts.length > 1 ? "s" : ""} low on stock
    </p>
    <ul className="mt-1 space-y-0.5">
      {lowStockProducts.map((p) => (
        <li key={p.id} className="text-xs text-amber-700 dark:text-amber-400">
          {p.name} -- {p.stock} left
        </li>
      ))}
    </ul>
  </div>
)}
```

- [ ] **Step 3: Add required Firestore index for stock + isPublished query**

Add to `firestore.indexes.json`:
```json
{
  "collectionGroup": "products",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isPublished", "order": "ASCENDING" },
    { "fieldPath": "stock", "order": "ASCENDING" }
  ]
}
```

Then:
```bash
firebase deploy --only firestore:indexes
```

- [ ] **Step 4: Run build -- expect PASS**
```bash
npm run build
```

---

## Summary

| Task | Area | Severity fixed |
|------|------|----------------|
| 1 | Vitest setup | Infrastructure |
| 2-3 | Tests: pricing, shipping | Coverage |
| 4 | Phone validation fix + tests | Medium |
| 5 | Zod on VietQR route | Medium |
| 6 | Error narrowing in DELETE | High |
| 7 | Remove console.error | High |
| 8 | Cart/notification badge cap | Low |
| 9 | AUTH_TIMEOUT_MS constant | Low |
| 10 | Firestore index userId+read | Critical |
| 11 | NotificationBell dark mode | Critical |
| 12 | Admin components dark mode | High |
| 13 | ProductForm dark mode | High |
| 14 | Localize relative timestamps | Medium |
| 15 | Vietnamese slug fix + tests | Medium |
| 16 | Refactor PATCH handler | High |
| 17 | Low-stock alert + index | Medium |
