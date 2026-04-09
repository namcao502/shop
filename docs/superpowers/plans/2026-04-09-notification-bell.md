# Notification Bell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real-time notification bell to the header that shows all order lifecycle events for customers and store-wide events for admins, persisted in Firestore.

**Architecture:** API routes write notification documents to Firestore using the Admin SDK alongside existing order mutations. A `useNotifications` hook subscribes via `onSnapshot` and feeds a `NotificationBell` component in the header. Admin order actions are migrated from client-side Firestore writes to API route calls so every mutation is captured.

**Tech Stack:** Next.js 14 App Router, TypeScript, Firebase Admin SDK (server writes), Firestore client SDK (onSnapshot reads), Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-04-09-notification-bell-design.md`

---

### Task 1: Add Notification types to types.ts

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add NotificationType union and Notification interface**

Open `src/lib/types.ts` and append at the end of the file:

```ts
export type NotificationType =
  | "order_placed"
  | "order_shipped"
  | "order_delivered"
  | "order_cancelled"
  | "payment_confirmed"
  | "address_updated"
  | "new_order"
  | "payment_received"
  | "cancel_requested"
  | "address_update_requested"
  | "order_deleted";

export interface Notification {
  id: string;           // Firestore doc id, added on read
  userId: string;       // Firebase UID or the literal string "admin"
  type: NotificationType;
  title: string;
  message: string;
  orderId: string | null;
  orderCode: string | null;
  read: boolean;
  createdAt: Date;
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: no new TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(notifications): add Notification types"
```

---

### Task 2: Create writeNotification server helper

**Files:**
- Create: `src/lib/notifications.ts`

- [ ] **Step 1: Create the file**

```ts
// src/lib/notifications.ts
import { adminDb } from "./firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { NotificationType } from "./types";

interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  orderId: string | null;
  orderCode: string | null;
}

/**
 * Write a notification document.
 * Pass `tx` to include the write in an existing Firestore transaction.
 * Without `tx`, the write is fire-and-forget (used in MoMo callback).
 */
export function writeNotification(
  data: NotificationInput,
  tx?: FirebaseFirestore.Transaction
): void {
  const ref = adminDb.collection("notifications").doc();
  const payload = {
    ...data,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  };
  if (tx) {
    tx.set(ref, payload);
  } else {
    ref.set(payload).catch((err: unknown) => {
      console.error("writeNotification failed", err);
    });
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/notifications.ts
git commit -m "feat(notifications): add writeNotification server helper"
```

---

### Task 3: Update Firestore security rules

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Add notifications collection rules**

Open `firestore.rules`. After the closing brace of the `counters` rule and before the outer closing braces, add:

```
    // Notifications: users read/update-read their own; admins also read "admin" docs; all creates via Admin SDK
    match /notifications/{notificationId} {
      allow read: if request.auth != null
        && (resource.data.userId == request.auth.uid
          || (isAdmin() && resource.data.userId == "admin"));
      allow update: if request.auth != null
        && (
          resource.data.userId == request.auth.uid
          || (isAdmin() && resource.data.userId == "admin")
        )
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(["read"]);
      allow create, delete: if false;
    }
```

The full file should look like:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    match /products/{productId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /categories/{categoryId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /orders/{orderId} {
      allow read: if request.auth != null
        && (resource.data.userId == request.auth.uid || isAdmin());
      allow write: if isAdmin();
    }

    match /users/{userId} {
      allow read: if request.auth != null
        && (request.auth.uid == userId || isAdmin());
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['isAdmin', 'createdAt']);
    }

    match /counters/{counterId} {
      allow read, write: if false;
    }

    match /notifications/{notificationId} {
      allow read: if request.auth != null
        && (resource.data.userId == request.auth.uid
          || (isAdmin() && resource.data.userId == "admin"));
      allow update: if request.auth != null
        && (
          resource.data.userId == request.auth.uid
          || (isAdmin() && resource.data.userId == "admin")
        )
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(["read"]);
      allow create, delete: if false;
    }
  }
}
```

- [ ] **Step 2: Deploy rules (if using Firebase CLI)**

```bash
firebase deploy --only firestore:rules
```

If you don't have Firebase CLI set up locally, deploy via Firebase console (Firestore > Rules tab).

- [ ] **Step 3: Create Firestore composite index**

The `useNotifications` query uses `where("userId", "in", [...])` + `orderBy("createdAt", "desc")`. Firestore requires a composite index for this.

Go to Firebase console > Firestore > Indexes > Add index:
- Collection: `notifications`
- Fields: `userId ASC`, `createdAt DESC`
- Query scope: Collection

Alternatively, run the app — Firestore will log a direct link to create the index when the query first runs.

- [ ] **Step 4: Commit**

```bash
git add firestore.rules
git commit -m "feat(notifications): add Firestore security rules and index note"
```

---

### Task 4: Create useNotifications hook

**Files:**
- Create: `src/hooks/useNotifications.ts`

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/useNotifications.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/lib/firebase/auth-context";
import type { Notification } from "@/lib/types";

export function useNotifications(): {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
  markOneRead: (id: string) => Promise<void>;
} {
  const { user, getIdToken } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    // Admins see their own notifications plus the shared "admin" feed
    const userIds = user.isAdmin ? [user.id, "admin"] : [user.id];

    const q = query(
      collection(db, "notifications"),
      where("userId", "in", userIds),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setNotifications(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Notification, "id" | "createdAt">),
            createdAt: d.data().createdAt?.toDate() ?? new Date(),
          }))
        );
      },
      (err) => {
        console.error("useNotifications snapshot error", err);
      }
    );

    return unsub;
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Mark all read via API (batch update on server)
  const markAllRead = useCallback(async () => {
    if (!user) return;
    const token = await getIdToken();
    if (!token) return;
    await fetch("/api/notifications/read-all", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
  }, [user, getIdToken]);

  // Mark one read via client Firestore SDK (security rules allow read field update)
  const markOneRead = useCallback(async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  }, []);

  return { notifications, unreadCount, markAllRead, markOneRead };
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useNotifications.ts
git commit -m "feat(notifications): add useNotifications hook with onSnapshot"
```

---

### Task 5: Create NotificationBell component

**Files:**
- Create: `src/components/layout/NotificationBell.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/layout/NotificationBell.tsx
"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/lib/firebase/auth-context";

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAllRead, markOneRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popup on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  if (!user) return null;

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-1 text-stone-600 hover:text-stone-900"
        aria-label="Notifications"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popup */}
      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border border-stone-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <span className="text-sm font-bold text-stone-900">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-stone-400">
              No notifications yet
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-stone-100 px-4 py-3 last:border-0 ${
                    !n.read
                      ? "border-l-2 border-l-amber-500 bg-amber-50"
                      : "opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-stone-900">{n.title}</span>
                    <span className="shrink-0 text-xs text-stone-400">
                      {formatRelative(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-600">{n.message}</p>
                  {n.orderId && (
                    <Link
                      href={`/orders?highlight=${n.orderId}`}
                      onClick={() => {
                        markOneRead(n.id);
                        setOpen(false);
                      }}
                      className="mt-1 block text-xs font-semibold text-amber-600 hover:text-amber-700"
                    >
                      VIEW ORDER &rarr;
                    </Link>
                  )}
                  {!n.read && !n.orderId && (
                    <button
                      onClick={() => markOneRead(n.id)}
                      className="mt-1 text-xs text-stone-400 hover:text-stone-600"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/NotificationBell.tsx
git commit -m "feat(notifications): add NotificationBell component"
```

---

### Task 6: Mount NotificationBell in Header

**Files:**
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Import and mount the bell**

Add the import at the top of `src/components/layout/Header.tsx`:

```ts
import { NotificationBell } from "@/components/layout/NotificationBell";
```

In the `<nav>` element, add `<NotificationBell />` between the Cart link and the user menu `<div className="relative">`:

```tsx
<nav className="hidden items-center gap-6 md:flex">
  <Link href="/products" className="text-sm text-stone-600 hover:text-stone-900">
    {t("nav.products")}
  </Link>
  <Link href="/cart" className="relative text-sm text-stone-600 hover:text-stone-900">
    {t("nav.cart")}
    {totalItems > 0 && (
      <span className="absolute -right-4 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-xs text-white">
        {totalItems}
      </span>
    )}
  </Link>

  <NotificationBell />

  {loading ? (
    <div className="h-8 w-20 animate-pulse rounded bg-stone-200" />
  ) : user ? (
    // ... rest unchanged
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Smoke test**

Run `npm run dev`, open `http://localhost:3000`. Bell icon should appear in the header between Cart and user avatar. Clicking it should open an empty popup "No notifications yet".

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "feat(notifications): mount NotificationBell in Header"
```

---

### Task 7: Create mark-all-read API route

**Files:**
- Create: `src/app/api/notifications/read-all/route.ts`

- [ ] **Step 1: Create the route**

```ts
// src/app/api/notifications/read-all/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAuth } from "@/lib/verify-admin";
import type { DocumentReference } from "firebase-admin/firestore";

export async function PATCH(request: NextRequest) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admins mark their personal feed AND the shared "admin" feed as read
  const userIds = authResult.isAdmin
    ? [authResult.uid, "admin"]
    : [authResult.uid];

  const allRefs: DocumentReference[] = [];

  for (const userId of userIds) {
    const snap = await adminDb
      .collection("notifications")
      .where("userId", "==", userId)
      .where("read", "==", false)
      .get();

    for (const docSnap of snap.docs) {
      allRefs.push(docSnap.ref);
    }
  }

  // Firestore batch limit is 500 operations — chunk to stay within bounds
  const BATCH_LIMIT = 500;
  for (let i = 0; i < allRefs.length; i += BATCH_LIMIT) {
    const chunk = allRefs.slice(i, i + BATCH_LIMIT);
    const batch = adminDb.batch();
    for (const ref of chunk) {
      batch.update(ref, { read: true });
    }
    await batch.commit();
  }

  return NextResponse.json({ updated: allRefs.length });
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/notifications/read-all/route.ts
git commit -m "feat(notifications): add PATCH /api/notifications/read-all route"
```

---

### Task 8: Extend PATCH /api/orders/[id] with admin actions and notifications

The current route only handles `cancel` and `update_address` for order owners. We need to:
1. Allow admins to bypass the ownership check
2. Add admin actions: `confirm_payment`, `ship`, `deliver`
3. Write notifications for every action

**Files:**
- Modify: `src/app/api/orders/[id]/route.ts`

- [ ] **Step 1: Replace the file with the updated version**

```ts
// src/app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAuth } from "@/lib/verify-admin";
import { FieldValue } from "firebase-admin/firestore";
import { shippingAddressSchema } from "@/lib/validation";
import type { ShippingAddress } from "@/lib/types";
import { writeNotification } from "@/lib/notifications";

type CustomerAction = "cancel" | "update_address";
type AdminAction = "confirm_payment" | "ship" | "deliver";
type PatchAction = CustomerAction | AdminAction;

interface PatchBody {
  action: PatchAction;
  shippingAddress?: ShippingAddress;
}

const VALID_ACTIONS: PatchAction[] = [
  "cancel",
  "update_address",
  "confirm_payment",
  "ship",
  "deliver",
];

const ADMIN_ONLY_ACTIONS: AdminAction[] = ["confirm_payment", "ship", "deliver"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.action || !VALID_ACTIONS.includes(body.action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Admin-only actions require isAdmin
  if (ADMIN_ONLY_ACTIONS.includes(body.action as AdminAction) && !authResult.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orderRef = adminDb.collection("orders").doc(id);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = orderSnap.data()!;

  // Customer actions require ownership; admin actions bypass this check
  const isOwner = order.userId === authResult.uid;
  const isAdminAction = ADMIN_ONLY_ACTIONS.includes(body.action as AdminAction);

  if (!isOwner && !isAdminAction && !authResult.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // --- CANCEL ---
  if (body.action === "cancel") {
    if (order.orderStatus !== "pending") {
      return NextResponse.json(
        { error: "Only pending orders can be cancelled" },
        { status: 400 }
      );
    }

    try {
      await adminDb.runTransaction(async (tx) => {
        const freshSnap = await tx.get(orderRef);
        if (!freshSnap.exists || freshSnap.data()!.orderStatus !== "pending") {
          throw new Error("Order is no longer cancellable");
        }
        const freshItems = freshSnap.data()!.items;
        const productRefs = freshItems.map((item: { productId: string }) =>
          adminDb.collection("products").doc(item.productId)
        );
        const productSnaps = await Promise.all(
          productRefs.map((ref: FirebaseFirestore.DocumentReference) => tx.get(ref))
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

        // Customer: their order was cancelled
        writeNotification(
          {
            userId: order.userId,
            type: "order_cancelled",
            title: `Order ${order.orderCode} cancelled`,
            message: authResult.isAdmin
              ? "Your order has been cancelled by the store."
              : "Your cancellation request has been processed.",
            orderId: id,
            orderCode: order.orderCode,
          },
          tx
        );

        // Admin: notified only when customer cancels (not when admin cancels their own action)
        if (!authResult.isAdmin) {
          writeNotification(
            {
              userId: "admin",
              type: "cancel_requested",
              title: `Order ${order.orderCode} cancelled by customer`,
              message: `Customer cancelled order ${order.orderCode}.`,
              orderId: id,
              orderCode: order.orderCode,
            },
            tx
          );
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cancel order";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  // --- UPDATE ADDRESS (customer requests, admin applies) ---
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

    try {
      await adminDb.runTransaction(async (tx) => {
        const freshSnap = await tx.get(orderRef);
        if (!freshSnap.exists) throw new Error("Order not found");
        if (!["pending", "confirmed"].includes(freshSnap.data()!.orderStatus)) {
          throw new Error("Address can only be updated for pending or confirmed orders");
        }

        tx.update(orderRef, {
          shippingAddress: validation.data,
          updatedAt: FieldValue.serverTimestamp(),
        });

        if (authResult.isAdmin) {
          // Admin updated the address — notify customer
          writeNotification(
            {
              userId: order.userId,
              type: "address_updated",
              title: `Shipping address updated for ${order.orderCode}`,
              message: "The store has updated your shipping address.",
              orderId: id,
              orderCode: order.orderCode,
            },
            tx
          );
        } else {
          // Customer updated address — notify admin
          writeNotification(
            {
              userId: "admin",
              type: "address_update_requested",
              title: `Address update for ${order.orderCode}`,
              message: `Customer updated shipping address on order ${order.orderCode}.`,
              orderId: id,
              orderCode: order.orderCode,
            },
            tx
          );
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update address";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  // --- CONFIRM PAYMENT (admin: VietQR manual confirmation) ---
  if (body.action === "confirm_payment") {
    if (order.paymentStatus === "paid") {
      return NextResponse.json({ error: "Payment already confirmed" }, { status: 400 });
    }

    try {
      await adminDb.runTransaction(async (tx) => {
        const freshSnap = await tx.get(orderRef);
        if (!freshSnap.exists) throw new Error("Order not found");
        if (freshSnap.data()!.paymentStatus === "paid") {
          throw new Error("Payment already confirmed");
        }

        tx.update(orderRef, {
          paymentStatus: "paid",
          orderStatus: "confirmed",
          updatedAt: FieldValue.serverTimestamp(),
        });

        writeNotification(
          {
            userId: order.userId,
            type: "payment_confirmed",
            title: `Payment confirmed for ${order.orderCode}`,
            message: "Your payment has been verified. Your order is being prepared.",
            orderId: id,
            orderCode: order.orderCode,
          },
          tx
        );
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to confirm payment";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  // --- SHIP (admin) ---
  if (body.action === "ship") {
    if (order.orderStatus !== "confirmed") {
      return NextResponse.json(
        { error: "Only confirmed orders can be marked as shipping" },
        { status: 400 }
      );
    }

    try {
      await adminDb.runTransaction(async (tx) => {
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
            userId: order.userId,
            type: "order_shipped",
            title: `Order ${order.orderCode} is on its way`,
            message: "Your package has been shipped and is on its way to you.",
            orderId: id,
            orderCode: order.orderCode,
          },
          tx
        );
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to mark order as shipping";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  // --- DELIVER (admin) ---
  if (body.action === "deliver") {
    if (order.orderStatus !== "shipping") {
      return NextResponse.json(
        { error: "Only shipping orders can be marked as delivered" },
        { status: 400 }
      );
    }

    try {
      await adminDb.runTransaction(async (tx) => {
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
            userId: order.userId,
            type: "order_delivered",
            title: `Order ${order.orderCode} delivered`,
            message: "Your order has been delivered. Thank you for shopping with us!",
            orderId: id,
            orderCode: order.orderCode,
          },
          tx
        );
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to mark order as delivered";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orderRef = adminDb.collection("orders").doc(id);
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

  // Notify admin that a customer deleted their order record
  writeNotification({
    userId: "admin",
    type: "order_deleted",
    title: `Order ${order.orderCode} deleted`,
    message: `Customer deleted the record of cancelled order ${order.orderCode}.`,
    orderId: null,
    orderCode: order.orderCode,
  });

  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/orders/[id]/route.ts
git commit -m "feat(notifications): extend order PATCH with admin actions and notification writes"
```

---

### Task 9: Add notifications to POST /api/orders

**Files:**
- Modify: `src/app/api/orders/route.ts`

- [ ] **Step 1: Import writeNotification and add notification writes**

Add the import at the top of `src/app/api/orders/route.ts` (after existing imports):

```ts
import { writeNotification } from "@/lib/notifications";
```

Inside the transaction, after `tx.set(orderRef, {...})` and before `return { orderId, orderCode, ... }`, add:

```ts
      // Customer: order placed
      writeNotification(
        {
          userId: authResult.uid,
          type: "order_placed",
          title: `Order ${orderCode} placed`,
          message: `Your order for ${orderItems.length} item(s) totalling ${subtotal.toLocaleString("vi-VN")} VND has been received.`,
          orderId: orderRef.id,
          orderCode,
        },
        tx
      );

      // Admin: new order arrived
      writeNotification(
        {
          userId: "admin",
          type: "new_order",
          title: `New order ${orderCode}`,
          message: `A new order (${orderItems.length} item(s), ${subtotal.toLocaleString("vi-VN")} VND) has been placed.`,
          orderId: orderRef.id,
          orderCode,
        },
        tx
      );
```

The full transaction block's return should look like:

```ts
      return { orderId: orderRef.id, orderCode, subtotal, totalAmount: subtotal };
```

Make sure the notification writes are inside the transaction callback before the `return` statement.

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/orders/route.ts
git commit -m "feat(notifications): write order_placed and new_order on order creation"
```

---

### Task 10: Add notifications to MoMo callback

**Files:**
- Modify: `src/app/api/momo/callback/route.ts`

- [ ] **Step 1: Import writeNotification**

Add the import at the top of the file:

```ts
import { writeNotification } from "@/lib/notifications";
```

- [ ] **Step 2: Add notification writes for successful payment**

Replace the payment-successful block:

```ts
  if (resultCode === 0) {
    // Payment successful
    await orderDoc.ref.update({
      paymentStatus: "paid",
      orderStatus: "confirmed",
      updatedAt: FieldValue.serverTimestamp(),
    });

    const order = orderDoc.data();

    // Customer: payment confirmed
    writeNotification({
      userId: order.userId,
      type: "payment_confirmed",
      title: `Payment confirmed for ${orderCode}`,
      message: "Your MoMo payment has been verified. Your order is being prepared.",
      orderId: orderDoc.id,
      orderCode,
    });

    // Admin: payment received
    writeNotification({
      userId: "admin",
      type: "payment_received",
      title: `Payment received for ${orderCode}`,
      message: `MoMo payment confirmed for order ${orderCode}.`,
      orderId: orderDoc.id,
      orderCode,
    });
  } else {
    // Payment failed — existing logic unchanged
    console.error("MoMo payment failed", {
      orderCode,
      resultCode,
      message,
      fullPayload: body,
    });
    await orderDoc.ref.update({
      paymentStatus: "failed",
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/momo/callback/route.ts
git commit -m "feat(notifications): write payment_confirmed and payment_received in MoMo callback"
```

---

### Task 11: Migrate admin orders page to use API routes

The admin page currently writes order status changes directly to Firestore from the client. These writes bypass the API routes so no notifications are triggered. This task migrates `handleUpdatePayment`, `handleUpdateStatus`, and `handleCancel` to call the API.

**Files:**
- Modify: `src/app/admin/orders/page.tsx`

- [ ] **Step 1: Add useAuth import and replace the three handlers**

Add `useAuth` to the imports:

```ts
import { useAuth } from "@/lib/firebase/auth-context";
```

Remove the now-unused `runTransaction` import. Keep `updateDoc`, `doc`, `serverTimestamp` (still used in fallback paths), and `collection`, `getDocs`, `query`, `orderBy` (used for reads).

At the top of the component body add:

```ts
const { getIdToken } = useAuth();
```

Replace the three handler functions with:

```ts
  const callOrderApi = async (orderId: string, body: Record<string, unknown>) => {
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json();
      console.error("Order API error", data);
    }
    await fetchOrders();
  };

  const handleUpdatePayment = async (orderId: string, status: PaymentStatus) => {
    if (status === "paid") {
      await callOrderApi(orderId, { action: "confirm_payment" });
    } else {
      // Other payment status changes (e.g. "failed") not covered by API — update directly
      await updateDoc(doc(db, "orders", orderId), {
        paymentStatus: status,
        updatedAt: serverTimestamp(),
      });
      await fetchOrders();
    }
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    const actionMap: Partial<Record<OrderStatus, string>> = {
      shipping: "ship",
      delivered: "deliver",
    };
    const action = actionMap[status];
    if (action) {
      await callOrderApi(orderId, { action });
    } else {
      // Fallback for any status without an API action
      await updateDoc(doc(db, "orders", orderId), {
        orderStatus: status,
        updatedAt: serverTimestamp(),
      });
      await fetchOrders();
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm(t("admin.cancelConfirm"))) return;
    await callOrderApi(orderId, { action: "cancel" });
  };
```

Note: `updateDoc`, `doc`, `serverTimestamp` are still needed for the fallback paths in `handleUpdatePayment` and `handleUpdateStatus`. Keep those imports.

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Smoke test admin flow**

Run `npm run dev`. Log in as admin, go to `/admin/orders`. Try:
1. Marking a confirmed order as "shipping" — customer bell should update with `order_shipped`
2. Marking a shipping order as "delivered" — customer bell should update with `order_delivered`
3. Cancelling a pending order — customer bell should update with `order_cancelled`

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/orders/page.tsx
git commit -m "feat(notifications): migrate admin order actions to API routes"
```

---

### Task 12: Final build and end-to-end verification

- [ ] **Step 1: Production build**

```bash
npm run build
```

Expected: clean build with no TypeScript errors.

- [ ] **Step 2: Verify full notification flow**

Run `npm run dev` with two browser sessions (one customer, one admin incognito window):

| Action | Expected customer notification | Expected admin notification |
|--------|-------------------------------|----------------------------|
| Customer places order | "Order ORDxxxx placed" | "New order ORDxxxx" |
| Admin confirms payment (VietQR) | "Payment confirmed for ORDxxxx" | none |
| MoMo payment webhook | "Payment confirmed for ORDxxxx" | "Payment received for ORDxxxx" |
| Admin marks shipping | "Order ORDxxxx is on its way" | none |
| Admin marks delivered | "Order ORDxxxx delivered" | none |
| Customer cancels | "Order ORDxxxx cancelled" | "Order ORDxxxx cancelled by customer" |
| Admin cancels | "Order ORDxxxx cancelled" | none |
| Customer updates address | none | "Address update for ORDxxxx" |
| Admin updates address | "Shipping address updated for ORDxxxx" | none |
| Customer deletes cancelled order | none | "Order ORDxxxx deleted" |

- [ ] **Step 3: Verify bell badge resets**

Click "Mark all as read" — badge should disappear. Click a new notification item — it should mark as read (amber highlight removed) and navigate to the order.

- [ ] **Step 4: Verify Firestore index**

If the bell shows no notifications despite orders existing, check the browser console for a Firestore index error. Follow the link in the error to create the composite index (`userId ASC, createdAt DESC`) in the Firebase console.
