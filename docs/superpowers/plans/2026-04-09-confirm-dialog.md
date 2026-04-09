# Confirm Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all native `confirm()` browser popups with a custom centered modal that matches the app's design system.

**Architecture:** A `ConfirmProvider` at the app root renders one shared `ConfirmDialog` component. Any component calls `useConfirm()` to get an async function that opens the modal and resolves with `true`/`false` when the user responds.

**Tech Stack:** Next.js 14 App Router, React context + hooks, Tailwind CSS, existing `Button` component.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/components/ui/ConfirmDialog.tsx` | Pure UI modal — overlay, card, title, description, buttons |
| Create | `src/lib/confirm-context.tsx` | `ConfirmProvider` + `useConfirm()` hook |
| Modify | `src/app/layout.tsx` | Wrap app with `ConfirmProvider` |
| Modify | `src/lib/i18n/translations.ts` | Add 4 new `*.title` TranslationKey entries |
| Modify | `src/lib/i18n/en.ts` | English translations for the 4 new keys |
| Modify | `src/lib/i18n/vi.ts` | Vietnamese translations for the 4 new keys |
| Modify | `src/app/admin/products/page.tsx` | Replace `confirm()` with `useConfirm()` |
| Modify | `src/app/admin/orders/page.tsx` | Replace `confirm()` with `useConfirm()` |
| Modify | `src/app/orders/[id]/page.tsx` | Replace `window.confirm()` x2 with `useConfirm()` |

---

## Task 1: Create ConfirmDialog UI component

**Files:**
- Create: `src/components/ui/ConfirmDialog.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run build 2>&1 | head -40
```

Expected: no errors related to `ConfirmDialog.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/ConfirmDialog.tsx
git commit -m "feat: add ConfirmDialog UI component"
```

---

## Task 2: Create ConfirmProvider and useConfirm hook

**Files:**
- Create: `src/lib/confirm-context.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface DialogState {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>({
    isOpen: false,
    title: "",
    description: "",
  });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    setState({ isOpen: true, ...options });
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = () => {
    setState((s) => ({ ...s, isOpen: false }));
    resolveRef.current?.(true);
    resolveRef.current = null;
  };

  const handleCancel = () => {
    setState((s) => ({ ...s, isOpen: false }));
    resolveRef.current?.(false);
    resolveRef.current = null;
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        isOpen={state.isOpen}
        title={state.title}
        description={state.description}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
  return ctx;
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run build 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/confirm-context.tsx
git commit -m "feat: add ConfirmProvider and useConfirm hook"
```

---

## Task 3: Wire ConfirmProvider into the app root

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add ConfirmProvider**

Current `layout.tsx` wraps children in `<AuthProvider><LocaleProvider>`. Add `ConfirmProvider` inside `LocaleProvider` so it can access locale if needed in the future.

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/firebase/auth-context";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { ConfirmProvider } from "@/lib/confirm-context";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Souvenir Shop - Vietnamese Souvenirs",
  description: "Shop unique Vietnamese souvenirs and gifts online",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <AuthProvider>
          <LocaleProvider>
            <ConfirmProvider>
              <div className="flex min-h-screen flex-col">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
            </ConfirmProvider>
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run build 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: wrap app with ConfirmProvider"
```

---

## Task 4: Add i18n title keys

The new dialog needs a `title` prop. The existing `*.Confirm` keys become the `description`. Add 4 new title keys.

**Files:**
- Modify: `src/lib/i18n/translations.ts`
- Modify: `src/lib/i18n/en.ts`
- Modify: `src/lib/i18n/vi.ts`

- [ ] **Step 1: Add keys to translations.ts**

In `translations.ts`, find the block containing `"order.cancelConfirm"` and `"order.deleteConfirm"` (around line 99-102). Add the two new order title keys adjacent to the existing confirm keys:

```ts
  | "order.cancelTitle"
  | "order.cancelConfirm"
  | "order.deleteTitle"
  | "order.deleteConfirm"
```

Find the block containing `"admin.deleteConfirm"` and `"admin.cancelConfirm"` (around line 155-161). Add:

```ts
  | "admin.deleteTitle"
  | "admin.deleteConfirm"
  | "admin.cancelTitle"
  | "admin.cancelConfirm"
```

- [ ] **Step 2: Add English translations to en.ts**

In `en.ts`, adjacent to the existing confirm entries, add:

```ts
  "order.cancelTitle": "Cancel order?",
  "order.deleteTitle": "Delete order?",
  "admin.deleteTitle": "Delete product?",
  "admin.cancelTitle": "Cancel order?",
```

- [ ] **Step 3: Add Vietnamese translations to vi.ts**

```ts
  "order.cancelTitle": "Huy don hang?",
  "order.deleteTitle": "Xoa don hang?",
  "admin.deleteTitle": "Xoa san pham?",
  "admin.cancelTitle": "Huy don hang?",
```

- [ ] **Step 4: Typecheck**

```bash
npm run build 2>&1 | head -40
```

Expected: no errors. TypeScript will catch any key name mismatches.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/translations.ts src/lib/i18n/en.ts src/lib/i18n/vi.ts
git commit -m "feat: add i18n title keys for confirm dialogs"
```

---

## Task 5: Update admin products page

**Files:**
- Modify: `src/app/admin/products/page.tsx`

Current code (line 61-64):
```ts
const handleDelete = async (id: string) => {
  if (!confirm(t("admin.deleteConfirm"))) return;
  ...
```

- [ ] **Step 1: Add useConfirm import and hook call**

Add import at the top of the file:
```ts
import { useConfirm } from "@/lib/confirm-context";
```

Inside `AdminProductsPage`, after the existing `const { locale, t } = useLocale();` line, add:
```ts
const confirm = useConfirm();
```

- [ ] **Step 2: Update handleDelete**

Replace:
```ts
if (!confirm(t("admin.deleteConfirm"))) return;
```

With:
```ts
if (!await confirm({ title: t("admin.deleteTitle"), description: t("admin.deleteConfirm") })) return;
```

- [ ] **Step 3: Typecheck**

```bash
npm run build 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/products/page.tsx
git commit -m "feat: replace native confirm with custom dialog in admin products"
```

---

## Task 6: Update admin orders page

**Files:**
- Modify: `src/app/admin/orders/page.tsx`

Current code (line 99-102):
```ts
const handleCancel = async (orderId: string) => {
  if (!confirm(t("admin.cancelConfirm"))) return;
  ...
```

- [ ] **Step 1: Add useConfirm import and hook call**

Add import at the top of the file:
```ts
import { useConfirm } from "@/lib/confirm-context";
```

Inside `AdminOrdersPage`, after `const { locale, t } = useLocale();`, add:
```ts
const confirm = useConfirm();
```

- [ ] **Step 2: Update handleCancel**

Replace:
```ts
if (!confirm(t("admin.cancelConfirm"))) return;
```

With:
```ts
if (!await confirm({ title: t("admin.cancelTitle"), description: t("admin.cancelConfirm") })) return;
```

- [ ] **Step 3: Typecheck**

```bash
npm run build 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/orders/page.tsx
git commit -m "feat: replace native confirm with custom dialog in admin orders"
```

---

## Task 7: Update user order detail page

**Files:**
- Modify: `src/app/orders/[id]/page.tsx`

Current code:
- Line 61: `if (!window.confirm(t("order.cancelConfirm"))) return;`
- Line 116: `if (!window.confirm(t("order.deleteConfirm"))) return;`

- [ ] **Step 1: Add useConfirm import and hook call**

Add import at the top of the file:
```ts
import { useConfirm } from "@/lib/confirm-context";
```

Inside `OrderDetailPage`, after `const { locale, t } = useLocale();`, add:
```ts
const confirm = useConfirm();
```

- [ ] **Step 2: Update handleCancel**

Replace:
```ts
if (!window.confirm(t("order.cancelConfirm"))) return;
```

With:
```ts
if (!await confirm({ title: t("order.cancelTitle"), description: t("order.cancelConfirm") })) return;
```

- [ ] **Step 3: Update handleDelete**

Replace:
```ts
if (!window.confirm(t("order.deleteConfirm"))) return;
```

With:
```ts
if (!await confirm({ title: t("order.deleteTitle"), description: t("order.deleteConfirm") })) return;
```

- [ ] **Step 4: Typecheck**

```bash
npm run build 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/orders/[id]/page.tsx
git commit -m "feat: replace native confirm with custom dialog in order detail"
```

---

## Task 8: Final verification

- [ ] **Step 1: Full build + typecheck**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 2: Manual smoke test**

Start dev server:
```bash
npm run dev
```

Test each flow:
1. Admin > Products > Delete a product — custom modal appears, Cancel dismisses, Confirm deletes
2. Admin > Orders > Cancel an order — custom modal appears, Cancel dismisses, Confirm cancels
3. Orders > any order > Cancel order — custom modal appears
4. Orders > any order > Delete order — custom modal appears
5. Click overlay on any modal — modal dismisses (treated as cancel)
6. Press Escape on any modal — modal dismisses

- [ ] **Step 3: Verify no native confirm() remains**

```bash
grep -rn "window\.confirm\|if (!confirm(" src/ --include="*.tsx" --include="*.ts"
```

Expected: no matches. The hook usage (`await confirm({`) does not match this pattern.
