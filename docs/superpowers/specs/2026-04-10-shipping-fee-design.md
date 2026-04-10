# Shipping Fee Calculation -- Design Spec

Date: 2026-04-10

## Overview

Calculate and display a shipping fee on the checkout page based on the customer's province, before they place an order. The fee is shown in real-time as the province is selected. The server recalculates the fee independently to prevent client tampering.

No external API is used. A local fee table is sufficient for now; GHN/GHTK integration can be added later if needed.

## Fee Rules

| Condition | Fee |
|-----------|-----|
| Subtotal >= 500,000 VND | Free (0 VND) |
| Province = Ho Chi Minh City (code "79") or Hanoi (code "01") | 20,000 VND |
| All other provinces | 35,000 VND |

Constants:
- `SHIPPING_FREE_THRESHOLD = 500_000`
- `SHIPPING_FEE_HCM_HN = 20_000`
- `SHIPPING_FEE_DEFAULT = 35_000`

## Architecture

### Shared logic -- `src/lib/shipping.ts`

A pure function with no side effects:

```ts
calculateShippingFee(provinceCode: string, subtotal: number): number
```

Imported by both the checkout page (client) and the orders API route (server). The single source of truth ensures client display and server-saved value are always consistent.

### Checkout page -- `src/app/checkout/page.tsx`

- Derive `shippingFee` from `calculateShippingFee(address.province, subtotal)` whenever `address.province` or `subtotal` changes (via `useMemo` or derived variable).
- Update the order summary box to show:
  - Subtotal line
  - Shipping line (hidden until a province is selected; shows "Free shipping" when fee is 0)
  - Total line (subtotal + shippingFee)

### API route -- `src/app/api/orders/route.ts`

- After computing `subtotal` inside the transaction, call `calculateShippingFee(body.shippingAddress.province, subtotal)`.
- Replace the hardcoded `shippingFee: 0` with the calculated value.
- Set `totalAmount = subtotal + shippingFee`.
- Update notification messages to use `totalAmount` instead of `subtotal`.

## Data flow

```
User selects province
  -> checkout page calls calculateShippingFee() client-side
  -> order summary updates (shipping + total lines)

User clicks "Place Order"
  -> POST /api/orders with items + shippingAddress + paymentMethod
  -> server calls calculateShippingFee() independently
  -> order saved with correct shippingFee + totalAmount
```

## Files changed

| File | Change |
|------|--------|
| `src/lib/shipping.ts` | New -- fee constants and calculateShippingFee() |
| `src/app/checkout/page.tsx` | Show shipping fee + updated total in order summary |
| `src/app/api/orders/route.ts` | Replace hardcoded shippingFee: 0 with calculated value |

## Out of scope

- External shipping APIs (GHN, GHTK) -- future work
- Product weight/dimensions
- District-level fee granularity
- Admin UI for configuring fee rules
