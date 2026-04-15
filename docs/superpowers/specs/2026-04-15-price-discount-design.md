# Price Discount Feature — Design Spec

**Date:** 2026-04-15
**Status:** Approved

---

## Overview

Add discount support to the souvenir shop. Admins can set discounts per product, across a bulk selection of products, or site-wide. Customers see a red badge, the discounted price, and a strikethrough original price. The server always enforces effective prices — the client never dictates what is charged.

---

## Requirements

- Admin can set a discount on an individual product (fixed VND price or percentage off)
- Admin can select multiple products and apply a discount in bulk
- Admin can activate a site-wide sale (percentage off all products)
- Site-wide discount overrides all per-product discounts
- Discounts have no expiry — active until manually removed
- Customers see: red "-X%" badge on product image, discounted price (amber, bold), strikethrough original price, and a "You save X VND (Y%)" line on the detail page
- Order creation enforces effective prices server-side inside a Firestore transaction

---

## Data Model

### Product document (Firestore `products` collection)

Add one optional field:

```
discountPrice?: number   // sale price in VND; must be > 0 and < price
```

No other fields change. `price` always remains the original (non-discounted) price.

### Site-wide discount (Firestore `settings/discount` doc)

New document at path `settings/discount`:

```ts
{
  active: boolean        // true = site-wide sale is on
  value: number          // percentage to deduct (e.g. 20 = 20% off)
}
```

Site-wide is always percentage-based (not fixed price), since a fixed price per product makes no sense globally.

### Effective price logic

Used in all layers (client display, cart, order API):

```
if settings/discount.active:
  effectivePrice = floor(price * (1 - value / 100))
else if product.discountPrice exists:
  effectivePrice = product.discountPrice
else:
  effectivePrice = product.price
```

### OrderItem

No changes to the `OrderItem` type. The `price` field already snapshots the price at order time — it will store the effective price computed server-side.

---

## API Changes

### POST /api/orders (existing)

- Read `settings/discount` doc inside the transaction alongside product docs
- Apply effective price logic per item
- `subtotal`, `shippingFee`, `totalAmount` all derive from effective prices

### POST /api/products (existing)

- Accept optional `discountPrice?: number`
- Validation: must be integer, >= 1, and < `price` when present

### PUT /api/products/[id] (existing)

- Accept optional `discountPrice?: number | null`
- Same validation as above when value is a number
- Passing `discountPrice: null` explicitly removes the discount (Zod schema: `z.number().int().min(1).nullable().optional()`)

### GET /api/settings/discount (new, admin only)

- Returns current `settings/discount` doc
- Returns `{ active: false, value: 0 }` if doc does not exist

### PATCH /api/settings/discount (new, admin only)

- Accepts `{ active: boolean, value: number }`
- Validates: `value` is integer 1-99 when `active` is true
- Writes to `settings/discount` doc

---

## Admin UI

### Product form (`src/components/admin/ProductForm.tsx`)

- Add a "Discount" field in the price/stock row
- Input accepts a number; a toggle button switches between VND (fixed price) and % (percentage) modes
- In VND mode: value is saved directly as `discountPrice`
- In % mode: `discountPrice = floor(price * (1 - value / 100))` — always saved as final VND value
- Validation: discount price must be less than the regular price
- Clearing the field removes the discount (`discountPrice` omitted from payload)

### Products table (`src/app/admin/products/page.tsx`)

- Add a checkbox column to each product row
- When 1+ rows are selected, show an action bar with:
  - "Apply Discount" button — opens a small inline form (value + VND/% toggle), applies to all selected products
  - "Remove Discount" button — clears `discountPrice` on all selected products
- Discount column in the table shows current `discountPrice` or `—`

### Settings page (`src/app/admin/settings/page.tsx`) — new page

- New entry in admin sidebar: "Settings"
- Site-wide sale section:
  - Toggle (on/off)
  - Value input + % toggle (site-wide is percentage only)
  - Status indicator: "Active: 20% off all products"
- Reads from and writes to `GET/PATCH /api/settings/discount`

---

## Customer UI

### Site-wide discount on the client

The products listing page (`src/app/products/page.tsx`), homepage (`src/app/page.tsx`), and product detail page (`src/app/products/[slug]/page.tsx`) must each fetch `settings/discount` (one extra Firestore read, cached in component state) and pass it to `calculateEffectivePrice`. ProductCard receives `siteWide` as a prop.

### ProductCard (`src/components/products/ProductCard.tsx`)

- When effective price < original price:
  - Red "-X%" badge positioned top-left on the product image
  - Show effective price (amber, bold) as main price
  - Show original price below with `line-through` styling

### Product detail page (`src/app/products/[slug]/page.tsx`)

- When effective price < original price:
  - Red "-X%" badge on main image
  - Effective price large and bold (amber)
  - Original price inline with `line-through`
  - "You save X VND (Y%)" line in red below prices
- `addToCart` uses effective price

### Cart and checkout

- Cart stores effective price at add-to-cart time (no structural change to `CartItem`)
- Checkout displays `item.price` as already stored — no change needed
- Server recalculates independently; any client/server mismatch resolves to server value

---

## Shared Utility

Add `calculateEffectivePrice(product, siteWideDiscount?)` to `src/lib/pricing.ts` (new file):

```ts
export function calculateEffectivePrice(
  product: Pick<Product, "price" | "discountPrice">,
  siteWide?: { active: boolean; value: number }
): number {
  if (siteWide?.active && siteWide.value > 0) {
    return Math.floor(product.price * (1 - siteWide.value / 100));
  }
  if (product.discountPrice != null && product.discountPrice < product.price) {
    return product.discountPrice;
  }
  return product.price;
}
```

Used by: ProductCard, product detail page, order API.

---

## i18n

New translation keys (added to `TranslationKey`, `en.ts`, `vi.ts`):

| Key | EN | VI |
|-----|----|----|
| `form.discountPrice` | Discount | Giảm giá |
| `validation.discountPriceInvalid` | Discount price must be less than regular price | Giá giảm phải nhỏ hơn giá gốc |
| `product.youSave` | You save {amount} ({percent}%) | Bạn tiết kiệm {amount} ({percent}%) |
| `admin.settings` | Settings | Cài đặt |
| `admin.siteWideSale` | Site-wide Sale | Khuyến mãi toàn cửa hàng |
| `admin.siteWideSaleDesc` | Overrides all product discounts | Ghi đè tất cả giảm giá sản phẩm |
| `admin.applyDiscount` | Apply Discount | Áp dụng giảm giá |
| `admin.removeDiscount` | Remove Discount | Xóa giảm giá |

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/types.ts` | Add `discountPrice?: number` to `Product` |
| `src/lib/pricing.ts` | New — `calculateEffectivePrice` utility |
| `src/lib/i18n/translations.ts` | Add new keys |
| `src/lib/i18n/en.ts` | Add EN translations |
| `src/lib/i18n/vi.ts` | Add VI translations |
| `src/app/api/products/route.ts` | Accept `discountPrice` in schema |
| `src/app/api/products/[id]/route.ts` | Accept `discountPrice` in schema |
| `src/app/api/orders/route.ts` | Read site-wide discount, apply effective price logic |
| `src/app/api/settings/discount/route.ts` | New — GET and PATCH |
| `src/components/admin/ProductForm.tsx` | Add discount input with VND/% toggle |
| `src/app/admin/products/page.tsx` | Add checkboxes, bulk action bar |
| `src/app/admin/settings/page.tsx` | New — site-wide sale UI |
| `src/components/layout/AdminSidebar.tsx` | Add Settings nav link |
| `src/components/products/ProductCard.tsx` | Accept `siteWide` prop, discount badge + strikethrough |
| `src/app/products/[slug]/page.tsx` | Fetch site-wide discount, display + "You save" line |
| `src/app/products/page.tsx` | Fetch site-wide discount, pass to ProductCard |
| `src/app/page.tsx` | Fetch site-wide discount, pass to ProductCard (featured products) |
