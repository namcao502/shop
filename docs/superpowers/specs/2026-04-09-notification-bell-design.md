# Notification Bell Design

**Date:** 2026-04-09
**Status:** Approved

## Overview

A notification bell icon in the site header that shows a real-time popup of all events relevant to the logged-in user. Customers see updates about their own orders. Admins see store-wide activity. All notifications are persisted in Firestore.

## Scope

- Bell icon in `Header` between Cart and user avatar
- Popup list with detailed items (title + description + timestamp + link)
- Red badge showing unread count
- Real-time updates via Firestore `onSnapshot`
- "Mark all as read" action
- Click individual item marks it read and navigates to the order
- Notifications written by API routes (server-side, Admin SDK)

## Audience

| Recipient | userId field | Sees |
|-----------|-------------|------|
| Customer | Firebase UID | Their own order lifecycle events |
| Admin | `"admin"` (literal string) | All store-wide events |

Admin users see both their admin feed and their customer feed (if they also place orders). The bell merges both by querying `userId == currentUser.uid OR userId == "admin"` when the logged-in user is an admin.

## Firestore Data Model

Collection: `notifications`

```ts
interface Notification {
  id: string;
  userId: string;           // Firebase UID or "admin"
  type: NotificationType;
  title: string;            // e.g. "Order ORD0042 confirmed"
  message: string;          // e.g. "Your order is being prepared and will ship soon."
  orderId: string | null;   // for deep-link navigation
  orderCode: string | null; // display reference
  read: boolean;            // false = unread
  createdAt: Timestamp;
}
```

### Notification Types

**Customer types:**
- `order_placed` - order successfully created
- `order_shipped` - order marked as shipping
- `order_delivered` - order marked as delivered
- `order_cancelled` - order cancelled (by customer or admin)
- `payment_confirmed` - VietQR/MoMo payment verified (also sets order to confirmed)
- `address_updated` - shipping address updated by admin
**Admin types:**
- `new_order` - a customer placed a new order
- `payment_received` - a payment was confirmed via webhook
- `cancel_requested` - customer requested cancellation
- `address_update_requested` - customer requested address change
- `order_deleted` - an order was deleted

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
```

### Firestore Indexes Required

- Composite: `userId ASC, createdAt DESC`

### Firestore Security Rules

- Users can read their own notifications (`userId == request.auth.uid`)
- Admins can read documents where `userId == "admin"`
- All writes go through Admin SDK (no client writes)
- Users can update only the `read` field of their own notifications (for individual mark-read)
- Admins can also update the `read` field of documents where `userId == "admin"` (their shared feed)

## Write Flow

Every API route that mutates order state writes notification(s) in the same operation:

| API action | Customer notification | Admin notification |
|---|---|---|
| `POST /api/orders` | `order_placed` | `new_order` |
| `PATCH /api/orders/[id]` action=`confirm_payment` | `payment_confirmed` | - |
| `PATCH /api/orders/[id]` action=`ship` | `order_shipped` | - |
| `PATCH /api/orders/[id]` action=`deliver` | `order_delivered` | - |
| `PATCH /api/orders/[id]` action=`cancel` (user) | `order_cancelled` | `cancel_requested` |
| `PATCH /api/orders/[id]` action=`cancel` (admin) | `order_cancelled` | - |
| `PATCH /api/orders/[id]` action=`update_address` (user) | - | `address_update_requested` |
| `PATCH /api/orders/[id]` action=`update_address` (admin) | `address_updated` | - |
| `PATCH /api/orders/[id]` action=`delete` | - | `order_deleted` |
| `POST /api/momo/callback` (paid) | `payment_confirmed` | `payment_received` |

A shared `writeNotification(data, tx?)` helper in `src/lib/notifications.ts` wraps `adminDb.collection("notifications").doc()`. When `tx` is provided it uses the transaction; otherwise it writes directly (used in MoMo callback where no transaction exists).

## Client Architecture

### Hook: `useNotifications`

```ts
// src/hooks/useNotifications.ts
function useNotifications(): {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
  markOneRead: (id: string) => Promise<void>;
}
```

- Subscribes via `onSnapshot` on `notifications` collection
- Query: `where("userId", "in", [uid, ...(isAdmin ? ["admin"] : [])])`, `orderBy("createdAt", "desc")`, `limit(20)`
- Only active when user is logged in
- Unsubscribes on unmount

### Component: `NotificationBell`

```
src/components/layout/NotificationBell.tsx
```

- Renders bell SVG icon with red badge (count, hidden when 0)
- Click toggles popup open/closed
- Popup closes on outside click (same pattern as user menu in Header)
- Popup renders list of `NotificationItem` elements
- "Mark all as read" button at top calls `PATCH /api/notifications/read-all`
- Empty state: "No notifications yet"
- Max 20 items shown (limited by query)

### Notification Item UI

- Unread: amber left border (`border-left: 3px solid #d97706`), amber background (`#fffbeb`)
- Read: white background, dimmed opacity, no left border highlight
- Shows: title (bold), message (small), relative timestamp, "VIEW ORDER ->" link (if orderId present)
- Clicking item: marks as read via client-side Firestore SDK (`updateDoc(notifRef, { read: true })`), then navigates to `/orders?highlight={orderId}`. No API route needed -- security rules allow users to update the `read` field of their own docs.

### API Route: Mark All Read

```
PATCH /api/notifications/read-all
```

- Authenticated (verifyAuth)
- Batch-updates all unread docs where `userId == uid` (and `userId == "admin"` if admin) to `read: true`

## New Files

| File | Purpose |
|------|---------|
| `src/lib/notifications.ts` | `writeNotification()` server helper, `NotificationType`, `Notification` interface |
| `src/hooks/useNotifications.ts` | `onSnapshot` hook returning notifications + actions |
| `src/components/layout/NotificationBell.tsx` | Bell icon + popup UI component |
| `src/app/api/notifications/read-all/route.ts` | PATCH endpoint to mark all notifications read |

## Modified Files

| File | Change |
|------|--------|
| `src/lib/types.ts` | Add `Notification` interface and `NotificationType` union |
| `src/components/layout/Header.tsx` | Mount `NotificationBell` between Cart and user avatar |
| `src/app/api/orders/route.ts` | Write `order_placed` (customer) + `new_order` (admin) on POST |
| `src/app/api/orders/[id]/route.ts` | Write appropriate notifications on each PATCH action |
| `src/app/api/momo/callback/route.ts` | Write `payment_confirmed` + `payment_received` on successful callback |
| `firestore.rules` | Add read/write rules for `notifications` collection |

## Error Handling

- Notification write failures must NOT fail the primary order operation. Wrap notification writes in a try/catch separate from the main transaction where atomicity is not critical (e.g. MoMo callback). For order creation and status changes inside transactions, include notification writes in the same transaction so they succeed or fail together.
- If `onSnapshot` errors, the hook logs the error and returns empty state (bell shows no badge). Does not crash the page.
- `markAllRead` and `markOneRead` failures are silently ignored on the client (read state is cosmetic).

## Out of Scope

- Push notifications (browser/mobile)
- Email notifications
- Notification preferences / opt-out settings
- Pagination beyond 20 items
- Admin-to-customer direct messages
