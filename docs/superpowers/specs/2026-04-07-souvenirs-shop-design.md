# Souvenir Shop Website — Design Spec

**Date:** 2026-04-07
**Stack:** Next.js + Firebase + VietQR + MoMo Payment Gateway
**Deploy target:** Vercel

---

## Overview

A small online souvenir shop for a Vietnam-based seller. Customers browse 10-20 products across up to 5 categories, sign in with Google, add items to cart, and pay via VietQR (VCB bank transfer) or MoMo. An admin panel lets the owner manage products, view orders, confirm VietQR payments, and track business metrics.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend framework | Next.js 14 (App Router) | SSR for product SEO, API routes for payment webhooks |
| Styling | Tailwind CSS | Fast, consistent, utility-first |
| Auth | Firebase Auth (Google provider) | As requested |
| Database | Firestore | As requested; flexible, real-time |
| File storage | Firebase Storage | Product images |
| Payment - bank | VietQR API (vietqr.io) | Generate dynamic QR for VCB transfers |
| Payment - wallet | MoMo Payment Gateway | Auto-confirm via webhook |
| Hosting | Vercel | Native Next.js support, free tier |

---

## Pages

### Customer-facing

| Route | Description |
|---|---|
| `/` | Home: hero banner, featured products, category grid |
| `/products` | Product listing with category filter |
| `/products/[slug]` | Product detail: images, description, price, Add to Cart |
| `/cart` | Cart review, quantity edit, proceed to checkout |
| `/checkout` | Shipping address form, payment method selection, QR display |
| `/orders` | My orders: list of all orders for the signed-in user, with status |
| `/orders/[id]` | Order detail: items, payment status, shipping status, timeline |

### Admin panel (protected)

| Route | Description |
|---|---|
| `/admin` | Dashboard: KPIs, recent orders, top products, order status breakdown |
| `/admin/products` | CRUD products and categories, upload images |
| `/admin/orders` | View all orders, confirm VietQR payments, update shipping status |

Admin access is controlled by an `isAdmin: true` flag on the Firestore user document. Only users with this flag can access `/admin/*` routes.

---

## Firestore Collections

### `products`
```
id: string (auto)
name: string
slug: string
description: string
price: number (VND)
images: string[] (Firebase Storage URLs; first element is the primary/thumbnail image)
categoryId: string
stock: number
isPublished: boolean
```

### `categories`
```
id: string (auto)
name: string
slug: string
order: number (display sort order)
```

### `orders`
```
id: string (auto)
orderCode: string (human-readable, e.g. "ORD0042" -- used as VietQR transfer note; generated from a Firestore counter document `counters/orders` incremented atomically via transaction)
userId: string (Firebase Auth UID)
items: { productId, name, price, qty }[]
shippingAddress: { name, phone, address, district, city, province }
subtotal: number (VND, sum of items)
shippingFee: number (VND, defaults to 0; admin updates when confirming)
totalAmount: number (VND, subtotal + shippingFee)
paymentMethod: "vietqr" | "momo"
paymentStatus: "pending" | "paid" | "failed"
orderStatus: "pending" | "confirmed" | "shipping" | "delivered" | "cancelled"
createdAt: timestamp
updatedAt: timestamp
```

### `users`
```
id: string (Firebase Auth UID)
email: string
displayName: string
photoURL: string
isAdmin: boolean
createdAt: timestamp
```

---

## Payment Flows

### VietQR (VCB bank transfer)

1. Customer places order (via Next.js API route `/api/orders`), order created with `paymentStatus: "pending"` and a generated `orderCode` (e.g., "ORD0042")
2. API route calls vietqr.io to generate a dynamic QR code server-side, embedding the VCB account number, exact amount, and `orderCode` as transfer note. Returns QR image URL to the client. (Server-side to avoid exposing bank details in the browser.)
3. Customer scans QR with banking app, completes transfer
4. Admin sees incoming transfer in their banking app, matches `orderCode`, marks order as paid in `/admin/orders`
5. Order `paymentStatus` updated to `"paid"`, `orderStatus` updated to `"confirmed"`

### MoMo

1. Customer places order (via Next.js API route `/api/orders`), order created with `paymentStatus: "pending"`
2. API route calls MoMo Payment Gateway, passing `orderCode`, amount, and `returnUrl` (`/orders/[id]`). Receives a payment URL.
3. Customer is redirected to MoMo app/web to complete payment
4. MoMo sends webhook to `/api/momo/callback`
5. API route verifies HMAC signature. On success: updates order `paymentStatus: "paid"` and `orderStatus: "confirmed"` in Firestore. On failure: logs the event with full payload, order stays `"pending"`, admin can manually confirm via `/admin/orders`.
6. Customer is redirected to `returnUrl` (`/orders/[id]`) which shows current payment status

---

## Admin Dashboard KPIs

- Revenue today and this month (sum of paid orders)
- Order count today and this month
- Low stock alerts (products with stock < 5)
- Recent orders table: order ID, customer, amount, payment method, status
- Top selling products: ranked by units sold
- Order status breakdown: count per stage (pending, confirmed, shipping, delivered, cancelled)

---

## Stock Management

Stock is decremented when an order is placed (on order creation) using a Firestore transaction: read current stock, verify sufficient quantity, decrement stock, and create order document atomically. This prevents race conditions where two concurrent customers both see stock=1 and both order successfully.

If a customer does not complete payment, the admin manually sets `orderStatus: "cancelled"` in `/admin/orders`, which restores the stock (also via transaction). Automated order expiry is out of scope.

---

## Cart State

Cart is stored in `localStorage` (no login required to browse and add items). On checkout, user must sign in with Google. On sign-in, cart persists from `localStorage`.

Before proceeding to checkout, cart quantities are validated against current stock. If any item's cart quantity exceeds available stock, a warning is shown and the quantity is adjusted down.

---

## Authentication & Authorization

- Google Sign-In via Firebase Auth; sign-out button in user menu
- All customers can sign in and place orders
- Admin access: `isAdmin` field on user document in Firestore, set manually by the owner in Firebase console (or via a one-time bootstrap script)
- Server-side auth: client sends Firebase ID token in `Authorization` header; API routes and Next.js middleware use Firebase Admin SDK to verify tokens and check `isAdmin` from Firestore
- Admin routes protected by middleware in Next.js: verifies ID token via Admin SDK and checks `isAdmin` flag

---

## Security Rules (Firestore)

- `products`, `categories`: public read; admin write only
- `orders`: client reads restricted to own orders (where `userId == auth.uid`); all writes denied from client -- order creation and updates go through server-side API routes using Admin SDK (which validates item prices against product documents and stock availability before writing); admin can read/write all via Admin SDK
- `users`: users can read their own document and write non-admin fields (displayName, photoURL) only; `isAdmin` is write-protected from clients; admin can read all

---

## Error Handling

- Payment failures: show clear error on checkout page, allow retry
- Out-of-stock: disable Add to Cart, show "Out of stock" badge
- MoMo webhook failures: idempotent handler, log errors, admin can manually confirm as fallback
- Auth errors: redirect to sign-in page

---

## Out of Scope

- Discount codes / promotions
- Product reviews
- Multi-language support
- Automated shipping fee calculation -- admin sets `shippingFee` manually when confirming each order; it defaults to 0 at order creation; `totalAmount` is recalculated as `subtotal + shippingFee` whenever `shippingFee` is updated
- Email notifications (can be added later with Firebase Extensions)
