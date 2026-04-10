# Shipping Fee Calculation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a real-time shipping fee on the checkout page derived from the customer's province, and save the correct fee when the order is created server-side.

**Architecture:** A shared pure function `calculateShippingFee(provinceCode, subtotal)` in `src/lib/shipping.ts` is imported by both the checkout page (client) and the orders API route (server). The client derives the fee reactively when the province changes; the server recalculates it independently before writing the order to Firestore.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Firebase Admin SDK, Zod 4. No test framework -- use `npm run build` to catch TypeScript errors.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/shipping.ts` | Create | Fee constants + `calculateShippingFee()` pure function |
| `src/lib/i18n/en.ts` | Modify | Add `checkout.shippingFree: "Free"` key |
| `src/lib/i18n/vi.ts` | Modify | Add `checkout.shippingFree: "Mien phi"` key |
| `src/lib/i18n/translations.ts` | Modify | Add `checkout.shippingFree` to `TranslationKey` union |
| `src/app/checkout/page.tsx` | Modify | Derive fee from province, show subtotal/shipping/total rows |
| `src/app/api/orders/route.ts` | Modify | Replace hardcoded `shippingFee: 0` with calculated value |
| `src/components/cart/CartSummary.tsx` | Modify | Remove stale "Shipping calculated after checkout" note |

---

## Task 1: Create `src/lib/shipping.ts`

**Files:**
- Create: `src/lib/shipping.ts`

- [ ] **Step 1: Create the file**

```typescript
export const SHIPPING_FREE_THRESHOLD = 500_000;
export const SHIPPING_FEE_HCM_HN = 20_000;
export const SHIPPING_FEE_DEFAULT = 35_000;

// Province codes from src/data/vn-address.json
const HCM_HN_CODES = new Set(["79", "01"]);

/**
 * Calculate shipping fee based on destination province and order subtotal.
 * Returns 0 (free) if subtotal >= SHIPPING_FREE_THRESHOLD.
 */
export function calculateShippingFee(
  provinceCode: string,
  subtotal: number
): number {
  if (subtotal >= SHIPPING_FREE_THRESHOLD) return 0;
  return HCM_HN_CODES.has(provinceCode)
    ? SHIPPING_FEE_HCM_HN
    : SHIPPING_FEE_DEFAULT;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: build succeeds (or only pre-existing errors, none from shipping.ts).

- [ ] **Step 3: Commit**

```bash
git add src/lib/shipping.ts
git commit -m "feat: add shipping fee calculation utility"
```

---

## Task 2: Add `checkout.shippingFree` translation key

**Files:**
- Modify: `src/lib/i18n/translations.ts`
- Modify: `src/lib/i18n/en.ts`
- Modify: `src/lib/i18n/vi.ts`

- [ ] **Step 1: Add the key to the TranslationKey union in `src/lib/i18n/translations.ts`**

Find the line with `"checkout.goToOrder"` in the `TranslationKey` union and add the new key next to it:

```typescript
| "checkout.shippingFree"
```

- [ ] **Step 2: Add the English string to `src/lib/i18n/en.ts`**

Find `"checkout.goToOrder"` and add after it:

```typescript
"checkout.shippingFree": "Free",
```

- [ ] **Step 3: Add the Vietnamese string to `src/lib/i18n/vi.ts`**

Find `"checkout.goToOrder"` and add after it:

```typescript
"checkout.shippingFree": "Mien phi",
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/translations.ts src/lib/i18n/en.ts src/lib/i18n/vi.ts
git commit -m "feat: add checkout.shippingFree translation key"
```

---

## Task 3: Update checkout page to show fee

**Files:**
- Modify: `src/app/checkout/page.tsx`

The goal is to replace the single bold total line in the order summary box with three rows: Subtotal, Shipping (conditional), Total. The fee is derived reactively from `address.province` and `subtotal`.

- [ ] **Step 1: Add the shipping import and derive the fee**

At the top of `src/app/checkout/page.tsx`, add the import after the existing imports:

```typescript
import { calculateShippingFee } from "@/lib/shipping";
```

Inside `CheckoutPage`, after the existing state declarations (before the `if (authLoading)` guard), add:

```typescript
const fmtLocale = locale === "vi" ? "vi-VN" : "en-US";
const shippingFee: number | null = address.province
  ? calculateShippingFee(address.province, subtotal)
  : null;
const totalAmount = subtotal + (shippingFee ?? 0);
```

- [ ] **Step 2: Replace the order summary total line**

Find the existing order summary closing block (lines ~242-245):

```tsx
          <div className="mt-3 border-t pt-3 text-right text-lg font-bold text-amber-700">
            {formatPrice(subtotal, locale === "vi" ? "vi-VN" : "en-US")}
          </div>
```

Replace it with:

```tsx
          <div className="mt-3 border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>{t("order.subtotal")}</span>
              <span>{formatPrice(subtotal, fmtLocale)}</span>
            </div>
            {shippingFee !== null && (
              <div className="flex justify-between text-gray-600">
                <span>{t("order.shipping")}</span>
                <span>
                  {shippingFee === 0
                    ? t("checkout.shippingFree")
                    : formatPrice(shippingFee, fmtLocale)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 text-base font-bold text-amber-700">
              <span>{t("order.total")}</span>
              <span>{formatPrice(totalAmount, fmtLocale)}</span>
            </div>
          </div>
```

Also remove the inline `locale === "vi" ? "vi-VN" : "en-US"` expressions in the items map (line ~239) since `fmtLocale` is now defined:

```tsx
<span>{formatPrice(item.price * item.qty, fmtLocale)}</span>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no new errors.

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

1. Go to `http://localhost:3000/checkout` (sign in and add items first).
2. With no province selected: order summary shows items + single total line only.
3. Select "Ho Chi Minh" or "Ha Noi": shipping row appears showing "20.000 VND" (vi) or "20,000 VND" (en).
4. Select any other province: shipping row shows "35.000 VND".
5. Increase cart quantity until subtotal >= 500,000 VND: shipping row shows "Mien phi" / "Free".

- [ ] **Step 5: Commit**

```bash
git add src/app/checkout/page.tsx
git commit -m "feat: show real-time shipping fee in checkout order summary"
```

---

## Task 4: Update the orders API route

**Files:**
- Modify: `src/app/api/orders/route.ts`

- [ ] **Step 1: Add the import**

At the top of `src/app/api/orders/route.ts`, add after the existing imports:

```typescript
import { calculateShippingFee } from "@/lib/shipping";
```

- [ ] **Step 2: Replace hardcoded shippingFee and update totalAmount**

Find the block after `subtotal` is fully computed (around line 84-105). Currently:

```typescript
      tx.set(orderRef, {
        ...
        subtotal,
        shippingFee: 0,
        totalAmount: subtotal,
        ...
      });
```

Add the fee calculation right before `tx.set`:

```typescript
      const shippingFee = calculateShippingFee(
        body.shippingAddress.province,
        subtotal
      );
      const totalAmount = subtotal + shippingFee;
```

Then update `tx.set` to use these variables:

```typescript
      tx.set(orderRef, {
        orderCode,
        userId: authResult.uid,
        items: orderItems,
        shippingAddress: body.shippingAddress,
        subtotal,
        shippingFee,
        totalAmount,
        paymentMethod: body.paymentMethod,
        paymentStatus: "pending",
        orderStatus: "pending",
        createdAt: now,
        updatedAt: now,
      });
```

- [ ] **Step 3: Update notification messages to use totalAmount**

Find the two `writeNotification` calls. Change the message strings from using `subtotal` to `totalAmount`:

Customer notification (currently references `subtotal`):
```typescript
      writeNotification(
        {
          userId: authResult.uid,
          type: "order_placed",
          title: `Order ${orderCode} placed`,
          message: `Your order for ${orderItems.length} item(s) totalling ${totalAmount.toLocaleString("vi-VN")} VND has been received.`,
          orderId: orderRef.id,
          orderCode,
        },
        tx
      );
```

Admin notification (currently references `subtotal`):
```typescript
      writeNotification(
        {
          userId: "admin",
          type: "new_order",
          title: `New order ${orderCode}`,
          message: `A new order (${orderItems.length} item(s), ${totalAmount.toLocaleString("vi-VN")} VND) has been placed.`,
          orderId: orderRef.id,
          orderCode,
        },
        tx
      );
```

- [ ] **Step 4: Update the return value**

Find the return statement at the end of the transaction:

```typescript
      return { orderId: orderRef.id, orderCode, subtotal, totalAmount: subtotal };
```

Update it:

```typescript
      return { orderId: orderRef.id, orderCode, subtotal, shippingFee, totalAmount };
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no new errors.

- [ ] **Step 6: Manual smoke test**

Place a test order with a province other than HCM/HN and subtotal < 500,000 VND. Check the created order in Firestore -- `shippingFee` should be `35000` and `totalAmount` should equal `subtotal + 35000`.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/orders/route.ts
git commit -m "feat: calculate real shipping fee server-side when creating order"
```

---

## Task 5: Remove stale shipping note from CartSummary

**Files:**
- Modify: `src/components/cart/CartSummary.tsx`

- [ ] **Step 1: Remove the note paragraph**

In `src/components/cart/CartSummary.tsx`, find and remove this line (around line 31):

```tsx
        <p className="mt-1 text-xs text-gray-500">{t("cart.shippingNote")}</p>
```

The `cart.shippingNote` translation key and its strings in `en.ts`/`vi.ts` can stay -- removing the keys would require touching the `TranslationKey` union and both dictionaries for no functional gain.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/cart/CartSummary.tsx
git commit -m "chore: remove stale shipping note from cart summary"
```

---

## Self-Review

**Spec coverage:**
- [x] Local fee table with two tiers + free threshold -> Task 1
- [x] Real-time display on checkout page -> Task 3
- [x] Server recalculation in API route -> Task 4
- [x] Stale cart note removed -> Task 5
- [x] i18n for "Free" label -> Task 2

**Placeholder scan:** No TBD/TODO. All code blocks are complete.

**Type consistency:**
- `calculateShippingFee(provinceCode: string, subtotal: number): number` -- used identically in Task 3 (checkout page) and Task 4 (API route).
- `shippingFee: number | null` on the client (null = province not selected), `shippingFee: number` on the server (province is always present after validation). No conflict.
- `totalAmount` defined and returned in Task 4's transaction return matches the existing `{ orderId, orderCode, totalAmount }` destructure in checkout page line 147.
