# Security & Workflow Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all CRITICAL and HIGH issues found in the security + workflow review, then address MEDIUM issues, without breaking existing functionality.

**Architecture:** All changes are surgical edits to existing files. No new pages or data models. Each task is independently deployable unless noted. Ordered so prerequisites come first.

**Tech Stack:** Next.js 16 App Router, TypeScript, Firebase Admin SDK, Zod 4, crypto (built-in Node).

**No test framework is configured.** Each task uses `npm run build` to catch TypeScript errors and manual verification steps in place of automated tests.

---

## Task 1: Fix Storage Rules (CRITICAL C1)

**Problem:** `storage.rules:6` allows any authenticated user to write product images. Must be admin-only.

**Files:**
- Modify: `storage.rules`

- [ ] **Step 1: Edit storage.rules**

Full file after change:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{allPaths=**} {
      allow read;
      allow write: if request.auth != null
        && firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

- [ ] **Step 2: Deploy rules to Firebase**

```bash
npx firebase deploy --only storage
```

Expected: `Deploy complete!`

- [ ] **Step 3: Verify manually**

Log in as a non-admin customer in the browser. Open DevTools > Console:
```js
const { getStorage, ref, uploadBytes } = await import("firebase/storage");
const storage = getStorage();
await uploadBytes(ref(storage, "products/test.txt"), new Blob(["test"]));
```
Expected: `FirebaseError: storage/unauthorized`

Log in as an admin and repeat. Expected: upload succeeds.

- [ ] **Step 4: Commit**

```bash
git add storage.rules
git commit -m "fix: restrict product image uploads to admin users only"
```

---

## Task 2: Fix VietQR Endpoint (CRITICAL C3)

**Problem:** `src/app/api/vietqr/route.ts` trusts client-supplied `amount`. Must fetch `totalAmount` from Firestore.

**Files:**
- Modify: `src/app/api/vietqr/route.ts`
- Modify: `src/app/checkout/page.tsx` (caller -- stop sending `amount`)

- [ ] **Step 1: Rewrite the VietQR route**

```typescript
// src/app/api/vietqr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAuth } from "@/lib/verify-admin";

export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { orderId, orderCode } = body;

  if (!orderId || !orderCode) {
    return NextResponse.json(
      { error: "Missing orderId or orderCode" },
      { status: 400 }
    );
  }

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

  const amount: number = orderData.totalAmount;
  const bankId = process.env.VIETQR_BANK_ID;
  const accountNumber = process.env.VIETQR_ACCOUNT_NUMBER;
  const accountName = process.env.VIETQR_ACCOUNT_NAME;

  const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(orderCode)}&accountName=${encodeURIComponent(accountName ?? "")}`;

  return NextResponse.json({ qrUrl, orderCode, amount });
}
```

- [ ] **Step 2: Update the checkout page caller**

In `src/app/checkout/page.tsx` around line 168, change the VietQR request body from `{ amount: totalAmount, orderCode }` to `{ orderId, orderCode }`:

```typescript
// Before:
body: JSON.stringify({ amount: totalAmount, orderCode }),

// After:
body: JSON.stringify({ orderId, orderCode }),
```

(`orderId` is already in scope from the order creation response on line 154.)

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 4: Verify manually**

```bash
npm run dev
```

Place a VietQR order. Confirm the QR amount matches the order total shown on the order detail page.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/vietqr/route.ts src/app/checkout/page.tsx
git commit -m "fix: fetch VietQR amount from Firestore instead of trusting client"
```

---

## Task 3: Centralize Env Var Validation (LOW L1 -- PREREQUISITE for Tasks 5 and 6)

**Problem:** MoMo and VietQR env vars are accessed with `!` non-null assertions throughout API routes. Missing vars silently produce wrong HMACs or non-descriptive runtime errors. Creating `env.ts` now lets Tasks 5 and 6 import from it directly, avoiding a second edit pass.

**Files:**
- Create: `src/lib/env.ts`

- [ ] **Step 1: Create src/lib/env.ts**

```typescript
// src/lib/env.ts

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  momo: {
    partnerCode: requireEnv("MOMO_PARTNER_CODE"),
    accessKey: requireEnv("MOMO_ACCESS_KEY"),
    secretKey: requireEnv("MOMO_SECRET_KEY"),
    endpoint: requireEnv("MOMO_ENDPOINT"),
  },
  vietqr: {
    bankId: requireEnv("VIETQR_BANK_ID"),
    accountNumber: requireEnv("VIETQR_ACCOUNT_NUMBER"),
    accountName: requireEnv("VIETQR_ACCOUNT_NAME"),
  },
  baseUrl: requireEnv("NEXT_PUBLIC_BASE_URL"),
};
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no errors (all vars present in `.env.local`). A missing var now throws `Missing required environment variable: <NAME>` at startup instead of a cryptic runtime failure.

- [ ] **Step 3: Commit**

```bash
git add src/lib/env.ts
git commit -m "feat: centralize and validate required env vars at startup"
```

---

## Task 4: Add payment_failed NotificationType (PREREQUISITE for Task 5)

**Problem:** The MoMo callback needs to notify customers when payment fails, but `NotificationType` has no `"payment_failed"` value. Adding it here lets Task 5 use it directly instead of reusing the semantically wrong `"payment_confirmed"` type.

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/i18n/en.ts`
- Modify: `src/lib/i18n/vi.ts`
- Modify: `src/lib/i18n/translations.ts`

- [ ] **Step 1: Add "payment_failed" to NotificationType in types.ts**

Find the `NotificationType` union (line 73). Add `"payment_failed"`:

```typescript
export type NotificationType =
  | "order_placed"
  | "order_shipped"
  | "order_delivered"
  | "order_cancelled"
  | "payment_confirmed"
  | "payment_failed"
  | "address_updated"
  | "new_order"
  | "payment_received"
  | "cancel_requested"
  | "address_update_requested"
  | "order_deleted";
```

- [ ] **Step 2: Add translation keys to translations.ts**

Open `src/lib/i18n/translations.ts`. Find where `TranslationKey` is defined (it is a union of string literals). Add:
```
| "notification.payment_failed.title"
| "notification.payment_failed.message"
```

- [ ] **Step 3: Add English translations to en.ts**

In `src/lib/i18n/en.ts`, after the `"notification.payment_confirmed.*"` entries, add:
```typescript
  "notification.payment_failed.title": "Payment failed for {orderCode}",
  "notification.payment_failed.message": "Your MoMo payment could not be processed. Please try again from your order page.",
```

- [ ] **Step 4: Add Vietnamese translations to vi.ts**

Open `src/lib/i18n/vi.ts`. After the `"notification.payment_confirmed.*"` entries, add:
```typescript
  "notification.payment_failed.title": "Thanh toan that bai cho {orderCode}",
  "notification.payment_failed.message": "Thanh toan MoMo that bai. Vui long thu lai tu trang don hang.",
```

(Adjust the Vietnamese phrasing as needed -- avoid diacritics if the file uses ASCII-only strings; match the existing style in `vi.ts`.)

- [ ] **Step 5: Build check**

```bash
npm run build
```

Expected: no errors. TypeScript will enforce that all switch/if chains on `NotificationType` still compile.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/i18n/translations.ts src/lib/i18n/en.ts src/lib/i18n/vi.ts
git commit -m "feat: add payment_failed notification type"
```

---

## Task 5: Harden MoMo Callback (CRITICAL C2 + MEDIUM M4 + Workflow #9/#10)

**Depends on:** Task 3 (env.ts) and Task 4 (payment_failed type).

**Problems addressed:**
- C2: Raw JSON is destructured into HMAC without type validation; `?? ""` fallbacks weaken the signature check
- Workflow #2: `orderId` sent to MoMo was `orderCode` -- callback must now parse `orderCode` back out of the composite `momoOrderId` (format `ORD0042-<requestId>`)
- M4: Amount in webhook payload never verified against `order.totalAmount`
- Workflow #9: No customer notification on payment failure
- Workflow #10: Payment failure update is not transactional

**Files:**
- Modify: `src/app/api/momo/callback/route.ts`

> **Note on momoOrderId format:** Task 6 changes `momo/create` to send `orderId: ${orderCode}-${requestId}` to MoMo (e.g. `ORD0042-MOMO_PARTNER-1712345678000`). MoMo echoes this back in the callback's `orderId` field. Since `orderCode` is always `ORD` + digits (no hyphens), `momoOrderId.split("-")[0]` always recovers it correctly. This callback handles both the old format (where `orderId === orderCode`) and the new format safely because `ORD0042`.split("-")[0]` = `ORD0042` in both cases.

- [ ] **Step 1: Rewrite the callback route (final version)**

```typescript
// src/app/api/momo/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";
import { writeNotification } from "@/lib/notifications";
import { env } from "@/lib/env";
import { z } from "zod";

const momoCallbackSchema = z.object({
  partnerCode: z.string(),
  orderId: z.string(),
  requestId: z.string(),
  amount: z.number(),
  orderInfo: z.string(),
  orderType: z.string(),
  transId: z.number(),
  resultCode: z.number(),
  message: z.string(),
  extraData: z.string(),
  payType: z.string(),
  responseTime: z.number(),
  signature: z.string(),
});

export async function POST(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = momoCallbackSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const {
    partnerCode,
    orderId: momoOrderId,
    requestId,
    amount,
    orderInfo,
    orderType,
    transId,
    resultCode,
    message,
    extraData,
    payType,
    responseTime,
    signature,
  } = parsed.data;

  // Recover orderCode from composite momoOrderId ("ORD0042-<requestId>").
  // orderCode is "ORD" + digits (no hyphens), so the first segment is always orderCode.
  const orderCode = momoOrderId.split("-")[0];

  // Verify HMAC using validated (typed) values only -- no ?? "" fallbacks
  const rawSignature = `accessKey=${env.momo.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${momoOrderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

  const expectedSignature = crypto
    .createHmac("sha256", env.momo.secretKey)
    .update(rawSignature)
    .digest("hex");

  if (signature !== expectedSignature) {
    // Never log the expected signature -- only log a mismatch indicator
    console.error("MoMo webhook signature mismatch", { orderCode, match: false });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const ordersSnap = await adminDb
    .collection("orders")
    .where("orderCode", "==", orderCode)
    .limit(1)
    .get();

  if (ordersSnap.empty) {
    console.error("MoMo webhook: order not found", { orderCode });
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const orderRef = ordersSnap.docs[0].ref;

  if (resultCode === 0) {
    await adminDb.runTransaction(async (tx) => {
      const freshSnap = await tx.get(orderRef);
      if (!freshSnap.exists) throw new Error("Order not found");

      const order = freshSnap.data()!;

      // Idempotent: skip if already paid
      if (order.paymentStatus === "paid") return;

      // Verify amount matches the stored order total
      if (order.totalAmount !== amount) {
        console.error("MoMo webhook: amount mismatch", {
          orderCode,
          expected: order.totalAmount,
          received: amount,
        });
        throw new Error("Payment amount mismatch");
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
          title: `Payment confirmed for ${orderCode}`,
          message: "Your MoMo payment has been verified. Your order is being prepared.",
          orderId: orderRef.id,
          orderCode,
        },
        tx
      );

      writeNotification(
        {
          userId: "admin",
          type: "payment_received",
          title: `Payment received for ${orderCode}`,
          message: `MoMo payment confirmed for order ${orderCode}.`,
          orderId: orderRef.id,
          orderCode,
        },
        tx
      );
    });
  } else {
    // Payment failed -- transactional so the notification write is atomic with the status update
    console.error("MoMo payment failed", { orderCode, resultCode });
    await adminDb.runTransaction(async (tx) => {
      const freshSnap = await tx.get(orderRef);
      if (!freshSnap.exists) throw new Error("Order not found");

      const order = freshSnap.data()!;

      // Idempotent: skip if already marked failed
      if (order.paymentStatus === "failed") return;

      tx.update(orderRef, {
        paymentStatus: "failed",
        updatedAt: FieldValue.serverTimestamp(),
      });

      writeNotification(
        {
          userId: order.userId,
          type: "payment_failed",
          title: `Payment failed for ${orderCode}`,
          message: "Your MoMo payment could not be processed. Please try again from your order page.",
          orderId: orderRef.id,
          orderCode,
        },
        tx
      );
    });
  }

  return NextResponse.json({ message: "OK" });
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/momo/callback/route.ts
git commit -m "fix: harden MoMo callback -- validate payload types, verify amount, transactional failure handling, payment_failed notification"
```

---

## Task 6: Fix MoMo orderId Collision on Retry (CRITICAL Workflow #2 + HIGH H3)

**Depends on:** Task 3 (env.ts). Task 5 (callback) must also be deployed together or before this, since the callback now parses `orderCode` from the composite `momoOrderId`.

**Problems:**
- Workflow #2: `orderId` sent to MoMo equals `orderCode` -- MoMo requires globally unique `orderId` per transaction. Retrying a failed payment resubmits the same `orderId` and MoMo rejects it.
- H3: Client-supplied `orderCode` is never verified against the fetched order document.

**Strategy:** `momoOrderId = ${orderCode}-${requestId}`. `requestId` is already `${partnerCode}-${Date.now()}` (unique per call). The callback (Task 5) splits on `-` to recover `orderCode` from the first segment.

**Files:**
- Modify: `src/app/api/momo/create/route.ts`

- [ ] **Step 1: Rewrite momo/create/route.ts**

```typescript
// src/app/api/momo/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAuth } from "@/lib/verify-admin";
import { env } from "@/lib/env";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId, orderCode } = await request.json();

  if (!orderId || !orderCode) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const orderSnap = await adminDb.collection("orders").doc(orderId).get();
  if (!orderSnap.exists) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const orderData = orderSnap.data()!;

  if (orderData.userId !== authResult.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // H3: verify the client-supplied orderCode matches the stored value
  if (orderData.orderCode !== orderCode) {
    return NextResponse.json({ error: "Order code mismatch" }, { status: 400 });
  }

  const amount: number = orderData.totalAmount;
  const { partnerCode, accessKey, secretKey, endpoint } = env.momo;
  const baseUrl = env.baseUrl;

  const requestId = `${partnerCode}-${Date.now()}`;

  // Unique per transaction attempt -- MoMo rejects duplicate orderId across retries.
  // Callback recovers orderCode by splitting on "-" and taking the first segment.
  const momoOrderId = `${orderCode}-${requestId}`;

  const redirectUrl = `${baseUrl}/orders/${orderId}`;
  const ipnUrl = `${baseUrl}/api/momo/callback`;
  const orderInfo = `Payment for order ${orderCode}`;
  const requestType = "payWithMethod";
  const extraData = "";
  const autoCapture = true;
  const lang = "vi";

  const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${momoOrderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const momoBody = {
    partnerCode,
    partnerName: "Souvenir Shop",
    storeId: partnerCode,
    requestId,
    amount,
    orderId: momoOrderId,
    orderInfo,
    redirectUrl,
    ipnUrl,
    lang,
    requestType,
    autoCapture,
    extraData,
    signature,
  };

  const momoResponse = await fetch(`${endpoint}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(momoBody),
  });

  const momoData = await momoResponse.json();

  if (momoData.resultCode !== 0) {
    console.error("MoMo payment creation failed", {
      orderCode,
      resultCode: momoData.resultCode,
    });
    return NextResponse.json(
      { error: "MoMo payment creation failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ payUrl: momoData.payUrl });
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/momo/create/route.ts
git commit -m "fix: unique MoMo orderId per transaction attempt, validate orderCode against Firestore"
```

---

## Task 7: Add Security Headers (HIGH H5)

**Problem:** No `X-Frame-Options`, `X-Content-Type-Options`, or `Referrer-Policy` in `next.config.mjs`.

**Files:**
- Modify: `next.config.mjs`

- [ ] **Step 1: Add headers**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

- [ ] **Step 3: Verify headers**

```bash
npm run dev
# in another terminal:
curl -I http://localhost:3000 | grep -E "x-frame|x-content|referrer"
```

Expected:
```
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
```

- [ ] **Step 4: Commit**

```bash
git add next.config.mjs
git commit -m "feat: add security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)"
```

---

## Task 8: Fix Admin Layout Auth Timeout (HIGH H4)

**Problem:** If the Firebase auth check hangs, `loading` stays `true` indefinitely and the loading spinner is shown forever. Add a timeout that redirects rather than hanging.

**Note:** The current code does NOT render admin children during loading (line 24-29 return early before `children`). The audit concern about children being visible was incorrect. Only the timeout gap is real.

**Files:**
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Add timeout guard**

```typescript
"use client";

import { useAuth } from "@/lib/firebase/auth-context";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useLocale } from "@/lib/i18n/locale-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const AUTH_TIMEOUT_MS = 5000;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setTimedOut(true);
    }, AUTH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (timedOut || (!loading && !user?.isAdmin)) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="hidden h-full md:block">
        <AdminSidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminSidebar mobile />
        <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/layout.tsx
git commit -m "fix: redirect instead of hanging when admin auth check times out"
```

---

## Task 9: Fix update_address Shipping Fee Recalculation (HIGH Workflow #6)

**Problem:** `PATCH update_address` does not recalculate `shippingFee` and `totalAmount` when province changes. Stored totals and VietQR QR amounts become wrong.

**Files:**
- Modify: `src/app/api/orders/[id]/route.ts`

- [ ] **Step 1: Add calculateShippingFee import**

At the top of `src/app/api/orders/[id]/route.ts`, add:
```typescript
import { calculateShippingFee } from "@/lib/shipping";
```

- [ ] **Step 2: Replace the update_address transaction body**

Find the `update_address` transaction (the `runTransaction` call inside the `update_address` branch, around line 163). Replace the entire transaction callback with:

```typescript
      await adminDb.runTransaction(async (tx) => {
        const freshSnap = await tx.get(orderRef);
        if (!freshSnap.exists) throw new Error("Order not found");
        if (!["pending", "confirmed"].includes(freshSnap.data()!.orderStatus)) {
          throw new Error("Address can only be updated for pending or confirmed orders");
        }

        const freshOrder = freshSnap.data()!;
        const newProvince = validation.data.province;
        const oldProvince = (freshOrder.shippingAddress as { province?: string })?.province;

        const updatePayload: Record<string, unknown> = {
          shippingAddress: validation.data,
          updatedAt: FieldValue.serverTimestamp(),
        };

        // Recalculate shipping fee when province changes
        if (newProvince !== oldProvince) {
          const newShippingFee = calculateShippingFee(newProvince, freshOrder.subtotal as number);
          updatePayload.shippingFee = newShippingFee;
          updatePayload.totalAmount = (freshOrder.subtotal as number) + newShippingFee;
        }

        tx.update(orderRef, updatePayload);

        if (authResult.isAdmin) {
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
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/orders/[id]/route.ts
git commit -m "fix: recalculate shippingFee and totalAmount when province changes in update_address"
```

---

## Task 10: Fix DELETE TOCTOU Race Condition (HIGH Workflow #7)

**Problem:** `DELETE /api/orders/[id]` reads `orderStatus` then deletes without a transaction. A concurrent PATCH could change status between the two operations.

**Files:**
- Modify: `src/app/api/orders/[id]/route.ts`

- [ ] **Step 1: Wrap DELETE logic in a transaction**

In the DELETE handler, replace everything from `const orderRef = adminDb...` down to the `writeNotification` call with:

```typescript
  const orderRef = adminDb.collection("orders").doc(id);

  try {
    await adminDb.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);

      if (!orderSnap.exists) {
        throw Object.assign(new Error("Order not found"), { status: 404 });
      }

      const order = orderSnap.data()!;

      if (order.userId !== authResult.uid) {
        throw Object.assign(new Error("Forbidden"), { status: 403 });
      }

      if (order.orderStatus !== "cancelled") {
        throw Object.assign(new Error("Only cancelled orders can be deleted"), { status: 400 });
      }

      tx.delete(orderRef);

      writeNotification(
        {
          userId: "admin",
          type: "order_deleted",
          title: `Order ${order.orderCode} deleted`,
          message: `Customer deleted the record of cancelled order ${order.orderCode}.`,
          orderId: null,
          orderCode: order.orderCode,
        },
        tx
      );
    });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    return NextResponse.json(
      { error: e.message ?? "Failed to delete order" },
      { status: e.status ?? 400 }
    );
  }

  return new NextResponse(null, { status: 204 });
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/orders/[id]/route.ts
git commit -m "fix: wrap order DELETE in transaction to eliminate TOCTOU race condition"
```

---

## Task 11: Optimize verifyAuth -- Skip Firestore Read for Non-Admin Routes (HIGH Workflow #8)

**Problem:** `verifyAuth` always reads the Firestore user document to check `isAdmin`, even for routes that only need identity. Adds unnecessary latency to every order creation, VietQR, and MoMo request.

**Strategy:** Add `needsAdmin?: boolean` parameter (default `false`). Non-admin routes skip the Firestore read. Routes that check `authResult.isAdmin` must pass `{ needsAdmin: true }`.

**Files:**
- Modify: `src/lib/verify-admin.ts`
- Modify: `src/app/api/orders/[id]/route.ts` (PATCH only -- it checks `authResult.isAdmin`)

> **DELETE does not check `authResult.isAdmin`** -- it is customer-only. Do not add `needsAdmin: true` there.

- [ ] **Step 1: Update verify-admin.ts**

```typescript
// src/lib/verify-admin.ts
import { adminAuth, adminDb } from "./firebase/admin";

interface VerifyResult {
  uid: string;
  isAdmin: boolean;
}

export async function verifyAuth(
  authHeader: string | null,
  { needsAdmin = false }: { needsAdmin?: boolean } = {}
): Promise<VerifyResult | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split("Bearer ")[1];
  try {
    const decoded = await adminAuth.verifyIdToken(token);

    if (!needsAdmin) {
      // Skip Firestore read -- caller only needs identity, not admin status
      return { uid: decoded.uid, isAdmin: false };
    }

    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    const isAdmin = userDoc.exists ? userDoc.data()?.isAdmin === true : false;
    return { uid: decoded.uid, isAdmin };
  } catch {
    return null;
  }
}

export async function verifyAdminAuth(
  authHeader: string | null
): Promise<string | null> {
  const result = await verifyAuth(authHeader, { needsAdmin: true });
  if (!result || !result.isAdmin) return null;
  return result.uid;
}
```

- [ ] **Step 2: Update PATCH handler in orders/[id]/route.ts**

The PATCH handler checks `authResult.isAdmin` to gate admin-only actions. It must opt in:

```typescript
// In PATCH handler, line ~33:
// Before:
const authResult = await verifyAuth(request.headers.get("Authorization"));

// After:
const authResult = await verifyAuth(request.headers.get("Authorization"), { needsAdmin: true });
```

Do NOT change the DELETE handler -- it only checks `order.userId === authResult.uid`.

- [ ] **Step 3: Build check**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/verify-admin.ts src/app/api/orders/[id]/route.ts
git commit -m "perf: skip Firestore user read in verifyAuth for non-admin routes"
```

---

## Task 12: Fix Stale createdOrderId on Re-submission (MEDIUM Workflow #11)

**Problem:** `src/app/checkout/page.tsx` -- if the user gets an error and retries, `createdOrderId` is not cleared before the new attempt. Error messages on the second failure link to the first order.

**Files:**
- Modify: `src/app/checkout/page.tsx`

- [ ] **Step 1: Reset createdOrderId at the start of handleSubmit**

Find `handleSubmit`. After `setSubmitting(true)` and `setError(null)`, add one line:

```typescript
    setSubmitting(true);
    setError(null);
    setCreatedOrderId(null); // reset before each new attempt
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/checkout/page.tsx
git commit -m "fix: reset createdOrderId before each checkout submission attempt"
```

---

## Task 13: Harden PATCH Body Validation with Zod (LOW Workflow #16)

**Problem:** `PATCH /api/orders/[id]` uses a hand-rolled `PatchBody` interface. A Zod discriminated union makes all permissible shapes explicit and catches invalid combinations at the boundary.

**Files:**
- Modify: `src/app/api/orders/[id]/route.ts`

- [ ] **Step 1: Replace hand-rolled types with a Zod discriminated union**

At the top of the file, remove:
```typescript
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
```

Add (ensure `import { z } from "zod"` is at the top):
```typescript
const patchBodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("update_address"), shippingAddress: shippingAddressSchema }),
  z.object({ action: z.literal("confirm_payment") }),
  z.object({ action: z.literal("ship") }),
  z.object({ action: z.literal("deliver") }),
]);

type PatchBody = z.infer<typeof patchBodySchema>;

const ADMIN_ONLY_ACTIONS = ["confirm_payment", "ship", "deliver"] as const;
type AdminAction = (typeof ADMIN_ONLY_ACTIONS)[number];
```

- [ ] **Step 2: Replace the body-parsing block**

Find:
```typescript
  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.action || !VALID_ACTIONS.includes(body.action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
```

Replace with:
```typescript
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
```

- [ ] **Step 3: Remove the redundant shippingAddress validation in the update_address branch**

Since the discriminated union already validates `shippingAddress`, find this block inside the `update_address` branch:
```typescript
    const validation = shippingAddressSchema.safeParse(body.shippingAddress);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid shipping address" },
        { status: 400 }
      );
    }
```

Remove it. Then replace all references to `validation.data` with `body.shippingAddress` in that branch.

- [ ] **Step 4: Build check**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/orders/[id]/route.ts
git commit -m "refactor: replace hand-rolled PATCH body type with Zod discriminated union"
```

---

## Final Verification

- [ ] **Full build + lint**

```bash
npm run build && npm run lint
```

Expected: exits with code 0.

- [ ] **Smoke test critical paths**

```bash
npm run dev
```

1. Place a VietQR order -- QR amount matches the order total page
2. Attempt a MoMo order -- redirect to MoMo (or graceful error if sandbox unavailable)
3. Retry MoMo payment on the same order -- second attempt should succeed (no duplicate orderId rejection)
4. Cancel a pending order -- stock restored
5. Update shipping address with a different province -- order total updates accordingly
6. Non-admin tries to upload product image via DevTools console -- `storage/unauthorized`
7. Visit `/admin` as non-admin -- redirects to `/`
8. Check headers: `curl -I http://localhost:3000 | grep -E "x-frame|x-content|referrer"`

---

## Issues Deferred (Require Separate Decisions)

| Issue | Reason |
|-------|--------|
| Rate limiting (H1) | Requires infrastructure choice (Upstash, middleware layer) |
| Admin cancel of confirmed/shipping orders (Workflow #5) | Business decision -- may be intentional |
| Province code validation against vn-address.json (M1) | Low risk; needs discussion on valid province list maintenance |
| `.env.local` git history check (L4) | Manual: `git log --all -- .env.local` |
