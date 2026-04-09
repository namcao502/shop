# User Order Management Design

**Date:** 2026-04-09
**Status:** Draft

## Overview

Allow authenticated users to cancel, update the shipping address of, and delete their own orders directly from the order detail page. All mutations go through Next.js API routes using the Firebase Admin SDK, consistent with the existing "all writes through API routes" architecture rule.

## Status Rules

| Operation | Allowed when `orderStatus` is |
|-----------|-------------------------------|
| Cancel | `pending` only |
| Update address | `pending` or `confirmed` |
| Delete | `cancelled` only |

Order status lifecycle for reference:

```
pending -> confirmed -> shipping -> delivered
                  \-> cancelled (admin or user)
```

## API Layer

### New file: `src/app/api/orders/[id]/route.ts`

#### `PATCH /api/orders/[id]`

Body shape:
```ts
{ action: "cancel" }
{ action: "update_address", shippingAddress: ShippingAddress }
```

**Cancel (`action: "cancel"`)**
- Auth: `verifyAuth()` -- must pass
- Ownership: `order.userId === authResult.uid` -- else 403
- Status guard: `orderStatus === "pending"` -- else 400 with message
- Transaction: restore stock (`product.stock += item.qty` for each item), set `orderStatus: "cancelled"`, `updatedAt: serverTimestamp()`
- Response: 200 `{ success: true }`

**Update address (`action: "update_address"`)**
- Auth: `verifyAuth()` -- must pass
- Ownership: `order.userId === authResult.uid` -- else 403
- Status guard: `orderStatus === "pending" | "confirmed"` -- else 400
- Validation: `shippingAddressSchema.safeParse(body.shippingAddress)` -- else 400
- Write: `adminDb.collection("orders").doc(id).update(...)` with new `shippingAddress`, `updatedAt: serverTimestamp()`
- Response: 200 `{ success: true }`

#### `DELETE /api/orders/[id]`

- Auth: `verifyAuth()` -- must pass
- Ownership: `order.userId === authResult.uid` -- else 403
- Status guard: `orderStatus === "cancelled"` -- else 400
- Write: hard delete the Firestore document
- Response: 204 No Content

### Error responses

All errors return `{ error: string }` with appropriate HTTP status:
- 401: missing/invalid auth token
- 403: order belongs to a different user
- 404: order not found
- 400: status guard failed or validation error

## UI Layer

### Modified: `src/app/orders/[id]/page.tsx`

Add an **action bar** rendered below the status badges, conditioned on `orderStatus`:

| `orderStatus` | Actions shown |
|---------------|---------------|
| `pending` | "Cancel Order" (destructive) + "Update Address" |
| `confirmed` | "Update Address" only |
| `cancelled` | "Delete Order" (secondary/gray) |
| `shipping`, `delivered` | None |

**Cancel / Delete flow:**
1. `window.confirm` with localized confirmation message
2. Call API with `getIdToken()` bearer token
3. On success: re-fetch order (status will reflect change). For delete: redirect to `/orders` list.
4. On error: show inline error string below the action bar

**Update Address flow:**
1. "Update Address" button toggles an inline edit section below the action bar
2. Pre-fills `ShippingForm` (reuse existing component from `src/components/checkout/ShippingForm.tsx`) with current `order.shippingAddress`
3. "Save" button calls `PATCH` API; "Cancel" collapses the form without saving
4. On success: re-fetch order, collapse form
5. On error: show inline error

The `ShippingForm` component already supports `address`, `onChange`, and `errors` props -- no changes needed to it.

The order detail page currently does not import `useAuth`. It must be added to obtain `getIdToken()` for the bearer token on all three API calls.

## i18n Keys

Add to `src/lib/i18n/en.ts` and `src/lib/i18n/vi.ts`, and register in `TranslationKey` union in `translations.ts`:

| Key | English | Vietnamese |
|-----|---------|------------|
| `order.cancelOrder` | Cancel Order | Huy don hang |
| `order.cancelConfirm` | Are you sure you want to cancel this order? | Ban co chac muon huy don hang nay? |
| `order.updateAddress` | Update Address | Cap nhat dia chi |
| `order.deleteOrder` | Delete Order | Xoa don hang |
| `order.deleteConfirm` | Are you sure you want to delete this order? | Ban co chac muon xoa don hang nay? |
| `order.cancelSuccess` | Order cancelled. | Da huy don hang. |
| `order.deleteSuccess` | Order deleted. | Da xoa don hang. |
| `order.addressUpdated` | Address updated. | Da cap nhat dia chi. |
| `order.save` | Save | Luu |

## Files Changed

| File | Change |
|------|--------|
| `src/app/api/orders/[id]/route.ts` | New -- PATCH + DELETE handlers |
| `src/app/orders/[id]/page.tsx` | Add action bar + inline address form |
| `src/lib/i18n/en.ts` | Add 9 new keys |
| `src/lib/i18n/vi.ts` | Add 9 new keys |
| `src/lib/i18n/translations.ts` | Register new `TranslationKey` values |

No changes to `src/lib/types.ts` (all statuses already defined), `ShippingForm`, or any admin files.

## Testing

Use `npm run build` to catch TypeScript errors after implementation. Manual test cases:

1. Cancel a `pending` order -- stock restored, status becomes `cancelled`
2. Attempt cancel on `confirmed` order -- 400 error shown
3. Update address on `pending` order -- address persists after re-fetch
4. Update address on `confirmed` order -- allowed
5. Update address on `shipping` order -- 400 error shown
6. Delete a `cancelled` order -- document removed, redirect to orders list
7. Attempt delete on `pending` order -- 400 error shown
8. Attempt any action on another user's order -- 403
