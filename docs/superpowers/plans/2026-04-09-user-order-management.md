# User Order Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow authenticated users to cancel, update the shipping address of, and delete their own orders from the order detail page.

**Architecture:** Three new API route handlers (`PATCH` cancel/update-address, `DELETE`) under `src/app/api/orders/[id]/route.ts` using Firebase Admin SDK. The order detail page gains an action bar with conditional buttons and an inline address form powered by the existing `ShippingForm` component.

**Tech Stack:** Next.js 14 App Router, TypeScript, Firebase Admin SDK (`adminDb`, `FieldValue`), Zod (`shippingAddressSchema`), existing `verifyAuth()` for auth + ownership.

---

## File Map

| File | Action |
|------|--------|
| `src/lib/i18n/translations.ts` | Add 9 `TranslationKey` union members |
| `src/lib/i18n/en.ts` | Add 9 English strings |
| `src/lib/i18n/vi.ts` | Add 9 Vietnamese strings |
| `src/app/api/orders/[id]/route.ts` | Create -- PATCH + DELETE handlers |
| `src/app/orders/[id]/page.tsx` | Add action bar + inline address edit form |

---

### Task 1: Add i18n keys

**Files:**
- Modify: `src/lib/i18n/translations.ts`
- Modify: `src/lib/i18n/en.ts`
- Modify: `src/lib/i18n/vi.ts`

- [ ] **Step 1: Add keys to `TranslationKey` union in `translations.ts`**

In `src/lib/i18n/translations.ts`, find the line `| "order.shippingAddress"` and add 9 new members immediately after it:

```typescript
  | "order.shippingAddress"
  | "order.cancelOrder"
  | "order.cancelConfirm"
  | "order.updateAddress"
  | "order.deleteOrder"
  | "order.deleteConfirm"
  | "order.cancelSuccess"
  | "order.deleteSuccess"
  | "order.addressUpdated"
  | "order.save"
```

- [ ] **Step 2: Add English strings to `en.ts`**

In `src/lib/i18n/en.ts`, find `"order.shippingAddress": "Shipping Address",` and add after it:

```typescript
  "order.cancelOrder": "Cancel Order",
  "order.cancelConfirm": "Are you sure you want to cancel this order?",
  "order.updateAddress": "Update Address",
  "order.deleteOrder": "Delete Order",
  "order.deleteConfirm": "Are you sure you want to delete this order?",
  "order.cancelSuccess": "Order cancelled.",
  "order.deleteSuccess": "Order deleted.",
  "order.addressUpdated": "Address updated.",
  "order.save": "Save",
```

- [ ] **Step 3: Add Vietnamese strings to `vi.ts`**

In `src/lib/i18n/vi.ts`, find `"order.shippingAddress": "Địa chỉ giao hàng",` and add after it:

```typescript
  "order.cancelOrder": "Hủy đơn hàng",
  "order.cancelConfirm": "Bạn có chắc muốn hủy đơn hàng này?",
  "order.updateAddress": "Cập nhật địa chỉ",
  "order.deleteOrder": "Xóa đơn hàng",
  "order.deleteConfirm": "Bạn có chắc muốn xóa đơn hàng này?",
  "order.cancelSuccess": "Đã hủy đơn hàng.",
  "order.deleteSuccess": "Đã xóa đơn hàng.",
  "order.addressUpdated": "Đã cập nhật địa chỉ.",
  "order.save": "Lưu",
```

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```

Expected: no TypeScript errors. If you see `Type '"order.cancelOrder"' is not assignable to type 'TranslationKey'`, the union in `translations.ts` was not saved correctly.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/translations.ts src/lib/i18n/en.ts src/lib/i18n/vi.ts
git commit -m "feat(i18n): add user order management translation keys"
```

---

### Task 2: Create API route

**Files:**
- Create: `src/app/api/orders/[id]/route.ts`

- [ ] **Step 1: Create the file with PATCH and DELETE handlers**

Create `src/app/api/orders/[id]/route.ts` with this exact content:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAuth } from "@/lib/verify-admin";
import { FieldValue } from "firebase-admin/firestore";
import { shippingAddressSchema } from "@/lib/validation";
import type { ShippingAddress } from "@/lib/types";

interface PatchBody {
  action: "cancel" | "update_address";
  shippingAddress?: ShippingAddress;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: PatchBody = await request.json();
  const orderRef = adminDb.collection("orders").doc(params.id);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = orderSnap.data()!;

  if (order.userId !== authResult.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (body.action === "cancel") {
    if (order.orderStatus !== "pending") {
      return NextResponse.json(
        { error: "Only pending orders can be cancelled" },
        { status: 400 }
      );
    }

    try {
      await adminDb.runTransaction(async (tx) => {
        // Re-read inside transaction to guard against concurrent status changes
        const freshSnap = await tx.get(orderRef);
        if (!freshSnap.exists || freshSnap.data()!.orderStatus !== "pending") {
          throw new Error("Order is no longer cancellable");
        }
        const freshItems = freshSnap.data()!.items;
        for (const item of freshItems) {
          const productRef = adminDb.collection("products").doc(item.productId);
          const productSnap = await tx.get(productRef);
          if (productSnap.exists) {
            const currentStock = productSnap.data()!.stock ?? 0;
            tx.update(productRef, { stock: currentStock + item.qty });
          }
        }
        tx.update(orderRef, {
          orderStatus: "cancelled",
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cancel order";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  if (body.action === "update_address") {
    if (!["pending", "confirmed"].includes(order.orderStatus)) {
      return NextResponse.json(
        { error: "Address can only be updated for pending or confirmed orders" },
        { status: 400 }
      );
    }

    const validation = shippingAddressSchema.safeParse(body.shippingAddress);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid shipping address" },
        { status: 400 }
      );
    }

    await orderRef.update({
      shippingAddress: validation.data,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orderRef = adminDb.collection("orders").doc(params.id);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = orderSnap.data()!;

  if (order.userId !== authResult.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (order.orderStatus !== "cancelled") {
    return NextResponse.json(
      { error: "Only cancelled orders can be deleted" },
      { status: 400 }
    );
  }

  await orderRef.delete();

  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: no TypeScript errors. Common issues:
- `FieldValue` import missing -- it comes from `firebase-admin/firestore`, not `firebase/firestore`
- `params` type error in Next.js 14 -- the `{ params }` destructure shape shown above is correct for App Router

- [ ] **Step 3: Commit**

```bash
git add src/app/api/orders/[id]/route.ts
git commit -m "feat(api): add PATCH cancel/update-address and DELETE for user orders"
```

---

### Task 3: Add action bar and address form to order detail page

**Files:**
- Modify: `src/app/orders/[id]/page.tsx`

- [ ] **Step 1: Replace the full file with the updated version**

Replace the entire contents of `src/app/orders/[id]/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/lib/firebase/auth-context";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { ShippingForm } from "@/components/checkout/ShippingForm";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, formatDate } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { Order, ShippingAddress } from "@/lib/types";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { locale, t } = useLocale();
  const { getIdToken } = useAuth();
  const fmtLocale = locale === "vi" ? "vi-VN" : "en-US";

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [draftAddress, setDraftAddress] = useState<ShippingAddress | null>(null);

  async function fetchOrder() {
    const snap = await getDoc(doc(db, "orders", params.id as string));
    if (snap.exists()) {
      const data = snap.data();
      setOrder({
        id: snap.id,
        ...data,
        createdAt: data.createdAt?.toDate() ?? new Date(),
        updatedAt: data.updatedAt?.toDate() ?? new Date(),
      } as Order);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchOrder();
  }, [params.id]);

  async function authHeader(): Promise<string> {
    const token = await getIdToken();
    return `Bearer ${token}`;
  }

  async function handleCancel() {
    if (!order) return;
    if (!window.confirm(t("order.cancelConfirm"))) return;
    setSaving(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: await authHeader(),
        },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? "Something went wrong");
      } else {
        await fetchOrder();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAddress() {
    if (!order || !draftAddress) return;
    setSaving(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: await authHeader(),
        },
        body: JSON.stringify({ action: "update_address", shippingAddress: draftAddress }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? "Something went wrong");
      } else {
        setAddressFormOpen(false);
        setDraftAddress(null);
        await fetchOrder();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!order) return;
    if (!window.confirm(t("order.deleteConfirm"))) return;
    setSaving(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "DELETE",
        headers: { Authorization: await authHeader() },
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? "Something went wrong");
      } else {
        router.push("/orders");
      }
    } finally {
      setSaving(false);
    }
  }

  function openAddressForm() {
    if (!order) return;
    setDraftAddress({ ...order.shippingAddress });
    setAddressFormOpen(true);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-gray-200" />
          <div className="h-32 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900">{t("order.notFound")}</h1>
      </div>
    );
  }

  const showCancel = order.orderStatus === "pending";
  const showUpdateAddress = order.orderStatus === "pending" || order.orderStatus === "confirmed";
  const showDelete = order.orderStatus === "cancelled";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("order.order")} {order.orderCode}
        </h1>
        <span className="text-sm text-gray-500">
          {formatDate(order.createdAt, fmtLocale)}
        </span>
      </div>

      {/* Timeline */}
      <div className="mb-8 rounded-lg border p-6">
        <OrderTimeline currentStatus={order.orderStatus} />
      </div>

      {/* Status badges */}
      <div className="mb-6 flex gap-3">
        <div>
          <span className="text-xs text-gray-500">{t("order.payment")}</span>{" "}
          <Badge variant={order.paymentStatus}>{t(`status.${order.paymentStatus}` as TranslationKey)}</Badge>
        </div>
        <div>
          <span className="text-xs text-gray-500">{t("order.order")}</span>{" "}
          <Badge variant={order.orderStatus}>{t(`status.${order.orderStatus}` as TranslationKey)}</Badge>
        </div>
        <div>
          <span className="text-xs text-gray-500">{t("order.method")}</span>{" "}
          <span className="text-sm font-medium">
            {order.paymentMethod === "vietqr" ? t("order.bankTransfer") : t("order.momo")}
          </span>
        </div>
      </div>

      {/* Action bar */}
      {(showCancel || showUpdateAddress || showDelete) && (
        <div className="mb-6 rounded-lg border p-4">
          <div className="flex flex-wrap gap-2">
            {showCancel && (
              <button
                onClick={handleCancel}
                disabled={saving}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {t("order.cancelOrder")}
              </button>
            )}
            {showUpdateAddress && !addressFormOpen && (
              <button
                onClick={openAddressForm}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {t("order.updateAddress")}
              </button>
            )}
            {showDelete && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                {t("order.deleteOrder")}
              </button>
            )}
          </div>

          {actionError && (
            <p className="mt-2 text-sm text-red-600">{actionError}</p>
          )}

          {/* Inline address edit form */}
          {addressFormOpen && draftAddress && (
            <div className="mt-4 border-t pt-4">
              <ShippingForm
                address={draftAddress}
                onChange={(addr) => setDraftAddress(addr)}
              />
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleSaveAddress}
                  disabled={saving}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {saving ? "..." : t("order.save")}
                </button>
                <button
                  onClick={() => { setAddressFormOpen(false); setDraftAddress(null); setActionError(null); }}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {t("form.cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-3 font-medium text-gray-900">{t("order.itemsTitle")}</h2>
        {order.items.map((item, i) => (
          <div
            key={i}
            className="flex justify-between border-b py-2 last:border-0"
          >
            <span className="text-sm text-gray-700">
              {item.name} x {item.qty}
            </span>
            <span className="text-sm font-medium">
              {formatPrice(item.price * item.qty, fmtLocale)}
            </span>
          </div>
        ))}
        <div className="mt-3 space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">{t("order.subtotal")}</span>
            <span>{formatPrice(order.subtotal, fmtLocale)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t("order.shipping")}</span>
            <span>{formatPrice(order.shippingFee, fmtLocale)}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>{t("order.total")}</span>
            <span className="text-amber-700">
              {formatPrice(order.totalAmount, fmtLocale)}
            </span>
          </div>
        </div>
      </div>

      {/* Shipping address */}
      <div className="mt-4 rounded-lg border p-4">
        <h2 className="mb-2 font-medium text-gray-900">{t("order.shippingAddress")}</h2>
        <p className="text-sm text-gray-600">
          {order.shippingAddress.name} - {order.shippingAddress.phone}
        </p>
        <p className="text-sm text-gray-600">
          {order.shippingAddress.address}, {order.shippingAddress.ward}
        </p>
        <p className="text-sm text-gray-600">
          {order.shippingAddress.province}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: no TypeScript errors. Common issues:
- `useAuth` must export `getIdToken` -- check `src/lib/firebase/auth-context.tsx` if you see a missing property error
- `ShippingForm` `onChange` prop accepts `ShippingAddress` -- the `setDraftAddress` setter satisfies this because `draftAddress` is typed as `ShippingAddress | null`; if TypeScript complains, wrap: `(addr) => setDraftAddress(addr)`

- [ ] **Step 3: Commit**

```bash
git add src/app/orders/[id]/page.tsx
git commit -m "feat(orders): add user cancel, update address, and delete actions"
```

---

### Task 4: Manual verification checklist

Start the dev server: `npm run dev`

- [ ] **Cancel a pending order** -- button appears, confirm dialog shows, status changes to `cancelled`, stock is restored (check Firestore console)
- [ ] **Cancel a confirmed order** -- no Cancel button shown
- [ ] **Update address on a pending order** -- form opens pre-filled, save updates the shipping address section
- [ ] **Update address on a confirmed order** -- Update Address button shown, save works
- [ ] **Update address on a shipping order** -- no Update Address button shown
- [ ] **Delete a cancelled order** -- button appears, confirm dialog shows, redirects to `/orders` list, document removed from Firestore
- [ ] **Delete a pending order** -- no Delete button shown
- [ ] **Language toggle** -- switch to English and back, all action labels and confirms render in correct language
