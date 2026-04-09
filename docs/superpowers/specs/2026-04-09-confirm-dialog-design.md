# Confirm Dialog Design

**Date:** 2026-04-09
**Status:** Approved

## Problem

Four places in the app use the native browser `confirm()` popup:

- `src/app/admin/products/page.tsx:62` — delete product
- `src/app/admin/orders/page.tsx:100` — cancel order (admin)
- `src/app/orders/[id]/page.tsx:61` — cancel order (user)
- `src/app/orders/[id]/page.tsx:116` — delete order (user)

The native popup is unstyled, blocks the main thread, and cannot be themed. Replace all four with a custom modal that matches the app's design system.

## Requirements

- Centered modal with a dark overlay behind it
- Title + description text (no extra input confirmation required)
- Two buttons: Cancel and Confirm (danger variant)
- Clicking the overlay cancels
- Works via an `async`/`await` API — drop-in replacement for `confirm()`
- No per-page modal state management

## Architecture

### New files

**`src/components/ui/ConfirmDialog.tsx`**

Pure UI component. Props:

```ts
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}
```

Visual structure:
- Fixed full-screen overlay: `fixed inset-0 z-50 flex items-center justify-center bg-black/50`
- Centered card: `bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6`
- Title: `font-semibold text-gray-900`
- Description: `text-sm text-gray-600 mt-1`
- Button row: Cancel (`secondary`) + Confirm (`danger`) using existing `Button` component
- Clicking the overlay calls `onCancel`

**`src/lib/confirm-context.tsx`**

Exports:
- `ConfirmProvider` — renders `ConfirmDialog` at the root, holds internal state
- `useConfirm()` — returns `(options: ConfirmOptions) => Promise<boolean>`

Internal state shape:
```ts
interface DialogState {
  isOpen: boolean;
  title: string;
  description: string;
  resolve: ((value: boolean) => void) | null;
}
```

`useConfirm()` usage:
```ts
const confirm = useConfirm();
if (!await confirm({ title: t("order.cancelTitle"), description: t("order.cancelDesc") })) return;
// proceed with destructive action
```

### Modified files

**`src/app/layout.tsx`**
Wrap the app with `<ConfirmProvider>`.

**4 call sites**
Replace `if (!confirm(...))` / `if (!window.confirm(...))` with `if (!await confirm({ title, description }))`.

The i18n keys for title/description are passed in by the caller using the existing `t()` function.

The existing single-string confirm keys become the `description`. Four new `*.title` keys must be added to `translations.ts`, `en.ts`, and `vi.ts`:

| New key | EN | VI |
|---|---|---|
| `order.cancelTitle` | "Cancel order?" | "Huy don hang?" |
| `order.deleteTitle` | "Delete order?" | "Xoa don hang?" |
| `admin.deleteTitle` | "Delete product?" | "Xoa san pham?" |
| `admin.cancelTitle` | "Cancel order?" | "Huy don hang?" |

The existing `*.Confirm` keys are reused as the `description` argument unchanged.

The dialog's own Cancel/Confirm button labels are hardcoded in `ConfirmDialog.tsx` (English only is acceptable since the existing codebase mixes languages; they can be i18n-ified later if needed).

## Data Flow

```
useConfirm() called with { title, description }
  -> sets DialogState.isOpen = true, stores resolve fn
  -> returns Promise<boolean>

User clicks Confirm
  -> resolve(true), isOpen = false

User clicks Cancel or overlay
  -> resolve(false), isOpen = false

Promise resolves in caller
  -> caller proceeds or returns early
```

## Out of Scope

- Input confirmation (e.g., typing "DELETE")
- Multiple stacked dialogs
- Custom button labels per call-site (defaults: "Cancel" / "Confirm" are sufficient)
