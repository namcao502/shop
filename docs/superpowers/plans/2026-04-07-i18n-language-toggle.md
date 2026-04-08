# i18n Language Toggle Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a Vietnamese/English language toggle to every page in the souvenir shop, persisted in localStorage, defaulting to Vietnamese.

**Architecture:** Client-side only. A `LocaleProvider` (modelled on `AuthProvider`) wraps the app in `layout.tsx`. `useLocale()` returns `{ locale, setLocale, t }` where `t(key)` looks up a typed translation key in the active dictionary. A small toggle button in the Header switches languages. No URL routing; `formatPrice`/`formatDate` accept an optional `locale` argument so numbers and dates render in the active locale.

**Tech Stack:** Next.js 14 App Router, TypeScript, React Context + localStorage

**Spec:** `docs/superpowers/specs/2026-04-07-i18n-language-toggle-design.md`

---

## File Structure

```
src/lib/i18n/
  translations.ts       -- Locale type + TranslationKey union type (NEW)
  en.ts                 -- English dictionary Record<TranslationKey, string> (NEW)
  vi.ts                 -- Vietnamese dictionary Record<TranslationKey, string> (NEW)
  locale-context.tsx    -- LocaleProvider + useLocale() hook (NEW)

src/app/layout.tsx      -- MODIFY: add <LocaleProvider>, change lang="en" → lang="vi"
src/lib/format.ts       -- MODIFY: add optional locale param to formatPrice/formatDate

src/components/layout/Header.tsx         -- MODIFY: toggle button + string replacement
src/components/layout/Footer.tsx         -- MODIFY: add "use client", string replacement
src/components/layout/AdminSidebar.tsx   -- MODIFY: string replacement

src/app/page.tsx                         -- MODIFY: string replacement
src/app/products/page.tsx                -- MODIFY: string replacement
src/app/products/[slug]/page.tsx         -- MODIFY: string replacement + locale → format
src/app/cart/page.tsx                    -- MODIFY: string replacement
src/app/checkout/page.tsx                -- MODIFY: string replacement + locale → format
src/app/orders/page.tsx                  -- MODIFY: string replacement
src/app/orders/[id]/page.tsx             -- MODIFY: string replacement + locale → format

src/components/products/CategoryFilter.tsx  -- MODIFY: string replacement
src/components/products/ProductCard.tsx     -- MODIFY: add "use client", string replacement + locale → format

src/components/cart/CartItem.tsx         -- MODIFY: string replacement + locale → format
src/components/cart/CartSummary.tsx      -- MODIFY: add "use client", string replacement + locale → format

src/components/checkout/ShippingForm.tsx   -- MODIFY: string replacement
src/components/checkout/PaymentSelector.tsx -- MODIFY: string replacement
src/components/checkout/QRDisplay.tsx      -- MODIFY: add "use client", string replacement + locale → format

src/components/orders/OrderCard.tsx      -- MODIFY: add "use client", string replacement + locale → format
src/components/orders/OrderTimeline.tsx  -- MODIFY: add "use client", string replacement

src/app/admin/page.tsx                        -- MODIFY: string replacement + locale → format
src/components/admin/RecentOrdersTable.tsx    -- MODIFY: add "use client", string replacement + locale → format
src/components/admin/TopProducts.tsx          -- MODIFY: add "use client", string replacement
src/components/admin/StatusBreakdown.tsx      -- MODIFY: add "use client", string replacement

src/app/admin/products/page.tsx          -- MODIFY: string replacement
src/components/admin/ProductForm.tsx     -- MODIFY: string replacement
src/app/admin/orders/page.tsx            -- MODIFY: string replacement + locale → format
src/components/admin/OrderActions.tsx    -- MODIFY: string replacement
```

**Note:** No test framework is configured in this project. TDD steps are omitted; verify each task by running `npm run build` and manually checking the browser.

**Key count note:** The `TranslationKey` type defines ~140 keys (the spec's "~110" estimate was approximate). Both dictionaries are typed as `Record<TranslationKey, string>`, so the compiler enforces exhaustiveness — no runtime missing-key risk.

---

## Task 1: Translation type definitions

**Files:**
- Create: `src/lib/i18n/translations.ts`

- [x] **Step 1: Create `src/lib/i18n/translations.ts`**

```typescript
export type Locale = "vi" | "en";

export type TranslationKey =
  // nav
  | "nav.products"
  | "nav.cart"
  | "nav.myOrders"
  | "nav.adminPanel"
  | "nav.signOut"
  | "nav.signIn"
  | "nav.backToShop"
  // site
  | "site.name"
  // footer
  | "footer.copyright"
  // home
  | "home.hero.title"
  | "home.hero.subtitle"
  | "home.browseAll"
  | "home.featured"
  // products list
  | "products.title"
  | "products.all"
  // product detail
  | "product.outOfStock"
  | "product.notFound"
  | "product.backToProducts"
  | "product.addToCart"
  | "product.added"
  | "product.inStock"
  // cart
  | "cart.title"
  | "cart.empty"
  | "cart.continueShopping"
  | "cart.remove"
  | "cart.orderSummary"
  | "cart.subtotal"
  | "cart.total"
  | "cart.shippingNote"
  | "cart.proceedToCheckout"
  // checkout
  | "checkout.title"
  | "checkout.signInRequired"
  | "checkout.signInMessage"
  | "checkout.cartEmpty"
  | "checkout.browseProducts"
  | "checkout.orderSummary"
  | "checkout.stockAdjusted"
  | "checkout.fillAllFields"
  | "checkout.placeOrder"
  | "checkout.processing"
  | "checkout.somethingWentWrong"
  | "checkout.viewMyOrders"
  // shipping form
  | "shipping.title"
  | "shipping.fullName"
  | "shipping.phone"
  | "shipping.address"
  | "shipping.addressPlaceholder"
  | "shipping.district"
  | "shipping.city"
  | "shipping.province"
  // payment
  | "payment.title"
  | "payment.vietqr.label"
  | "payment.vietqr.desc"
  | "payment.momo.label"
  | "payment.momo.desc"
  // qr display
  | "qr.scanToPay"
  | "qr.transferNote"
  | "qr.amount"
  | "qr.afterPayment"
  // orders list
  | "orders.title"
  | "orders.signInRequired"
  | "orders.noOrders"
  | "orders.item"
  | "orders.items"
  // order detail
  | "order.notFound"
  | "order.payment"
  | "order.order"
  | "order.method"
  | "order.bankTransfer"
  | "order.momo"
  | "order.itemsTitle"
  | "order.subtotal"
  | "order.shipping"
  | "order.total"
  | "order.shippingAddress"
  // order timeline
  | "timeline.orderPlaced"
  | "timeline.confirmed"
  | "timeline.shipping"
  | "timeline.delivered"
  | "timeline.cancelled"
  // status labels (shared)
  | "status.pending"
  | "status.confirmed"
  | "status.shipping"
  | "status.delivered"
  | "status.cancelled"
  // admin sidebar + shared
  | "admin.title"
  | "admin.dashboard"
  | "admin.products"
  | "admin.orders"
  | "admin.backToShop"
  // admin dashboard kpis
  | "admin.revenueToday"
  | "admin.ordersToday"
  | "admin.revenueMonth"
  | "admin.pendingPayment"
  | "admin.pendingLabel"
  | "admin.ordersLabel"
  | "admin.recentOrders"
  | "admin.topSelling"
  | "admin.orderStatus"
  // admin table columns
  | "admin.colOrder"
  | "admin.colAmount"
  | "admin.colPayment"
  | "admin.colStatus"
  | "admin.colDate"
  | "admin.colName"
  | "admin.colPrice"
  | "admin.colStock"
  | "admin.colActions"
  // admin products page
  | "admin.addProduct"
  | "admin.newProduct"
  | "admin.editProduct"
  | "admin.published"
  | "admin.draft"
  | "admin.edit"
  | "admin.delete"
  | "admin.deleteConfirm"
  // admin orders page
  | "admin.confirmPayment"
  | "admin.markShipping"
  | "admin.markDelivered"
  | "admin.cancel"
  | "admin.cancelConfirm"
  | "admin.shipTo"
  // product form
  | "form.productName"
  | "form.slug"
  | "form.description"
  | "form.price"
  | "form.stock"
  | "form.category"
  | "form.selectCategory"
  | "form.images"
  | "form.imageUrl"
  | "form.add"
  | "form.published"
  | "form.saving"
  | "form.update"
  | "form.create"
  | "form.cancel";
```

- [x] **Step 2: Commit**

```bash
git add src/lib/i18n/translations.ts
git commit -m "feat(i18n): add TranslationKey type definitions"
```

---

## Task 2: English dictionary

**Files:**
- Create: `src/lib/i18n/en.ts`

- [x] **Step 1: Create `src/lib/i18n/en.ts`**

```typescript
import type { TranslationKey } from "./translations";

export const en: Record<TranslationKey, string> = {
  "nav.products": "Products",
  "nav.cart": "Cart",
  "nav.myOrders": "My Orders",
  "nav.adminPanel": "Admin Panel",
  "nav.signOut": "Sign Out",
  "nav.signIn": "Sign In with Google",
  "nav.backToShop": "Back to Shop",

  "site.name": "Souvenir Shop",

  "footer.copyright": "All rights reserved.",

  "home.hero.title": "Vietnamese Souvenirs",
  "home.hero.subtitle": "Unique handcrafted gifts shipped from Vietnam",
  "home.browseAll": "Browse All Products",
  "home.featured": "Featured Products",

  "products.title": "All Products",
  "products.all": "All",

  "product.outOfStock": "Out of Stock",
  "product.notFound": "Product not found",
  "product.backToProducts": "Back to Products",
  "product.addToCart": "Add to Cart",
  "product.added": "Added!",
  "product.inStock": "in stock",

  "cart.title": "Shopping Cart",
  "cart.empty": "Your cart is empty.",
  "cart.continueShopping": "Continue Shopping",
  "cart.remove": "Remove",
  "cart.orderSummary": "Order Summary",
  "cart.subtotal": "Subtotal",
  "cart.total": "Total",
  "cart.shippingNote": "Shipping calculated after checkout",
  "cart.proceedToCheckout": "Proceed to Checkout",

  "checkout.title": "Checkout",
  "checkout.signInRequired": "Sign in to continue",
  "checkout.signInMessage": "You need to sign in with Google to place an order.",
  "checkout.cartEmpty": "Cart is empty",
  "checkout.browseProducts": "Browse Products",
  "checkout.orderSummary": "Order Summary",
  "checkout.stockAdjusted": "Some quantities were adjusted due to stock limits.",
  "checkout.fillAllFields": "Please fill in all address fields.",
  "checkout.placeOrder": "Place Order",
  "checkout.processing": "Processing...",
  "checkout.somethingWentWrong": "Something went wrong. Please try again.",
  "checkout.viewMyOrders": "View My Orders",

  "shipping.title": "Shipping Address",
  "shipping.fullName": "Full Name",
  "shipping.phone": "Phone Number",
  "shipping.address": "Address",
  "shipping.addressPlaceholder": "House number, street name",
  "shipping.district": "District",
  "shipping.city": "City",
  "shipping.province": "Province",

  "payment.title": "Payment Method",
  "payment.vietqr.label": "Bank Transfer (VietQR)",
  "payment.vietqr.desc": "Scan QR code with your banking app to pay",
  "payment.momo.label": "MoMo",
  "payment.momo.desc": "Redirect to MoMo to complete payment",

  "qr.scanToPay": "Scan to Pay",
  "qr.transferNote": "Transfer note:",
  "qr.amount": "Amount:",
  "qr.afterPayment": "After payment, your order will be confirmed by the seller.",

  "orders.title": "My Orders",
  "orders.signInRequired": "Sign in to view orders",
  "orders.noOrders": "No orders yet.",
  "orders.item": "item",
  "orders.items": "items",

  "order.notFound": "Order not found",
  "order.payment": "Payment:",
  "order.order": "Order:",
  "order.method": "Method:",
  "order.bankTransfer": "Bank Transfer (VietQR)",
  "order.momo": "MoMo",
  "order.itemsTitle": "Items",
  "order.subtotal": "Subtotal",
  "order.shipping": "Shipping",
  "order.total": "Total",
  "order.shippingAddress": "Shipping Address",

  "timeline.orderPlaced": "Order Placed",
  "timeline.confirmed": "Confirmed",
  "timeline.shipping": "Shipping",
  "timeline.delivered": "Delivered",
  "timeline.cancelled": "Order Cancelled",

  "status.pending": "Pending",
  "status.confirmed": "Confirmed",
  "status.shipping": "Shipping",
  "status.delivered": "Delivered",
  "status.cancelled": "Cancelled",

  "admin.title": "Admin",
  "admin.dashboard": "Dashboard",
  "admin.products": "Products",
  "admin.orders": "Orders",
  "admin.backToShop": "Back to Shop",

  "admin.revenueToday": "Revenue Today",
  "admin.ordersToday": "Orders Today",
  "admin.revenueMonth": "Revenue This Month",
  "admin.pendingPayment": "Pending Payment",
  "admin.pendingLabel": "pending",
  "admin.ordersLabel": "orders",
  "admin.recentOrders": "Recent Orders",
  "admin.topSelling": "Top Selling",
  "admin.orderStatus": "Order Status",

  "admin.colOrder": "Order",
  "admin.colAmount": "Amount",
  "admin.colPayment": "Payment",
  "admin.colStatus": "Status",
  "admin.colDate": "Date",
  "admin.colName": "Name",
  "admin.colPrice": "Price",
  "admin.colStock": "Stock",
  "admin.colActions": "Actions",

  "admin.addProduct": "Add Product",
  "admin.newProduct": "New Product",
  "admin.editProduct": "Edit Product",
  "admin.published": "Published",
  "admin.draft": "Draft",
  "admin.edit": "Edit",
  "admin.delete": "Delete",
  "admin.deleteConfirm": "Delete this product?",

  "admin.confirmPayment": "Confirm Payment",
  "admin.markShipping": "Mark Shipping",
  "admin.markDelivered": "Mark Delivered",
  "admin.cancel": "Cancel",
  "admin.cancelConfirm": "Cancel this order and restore stock?",
  "admin.shipTo": "Ship to:",

  "form.productName": "Product Name",
  "form.slug": "Slug",
  "form.description": "Description",
  "form.price": "Price (VND)",
  "form.stock": "Stock",
  "form.category": "Category",
  "form.selectCategory": "Select category",
  "form.images": "Images (first is thumbnail)",
  "form.imageUrl": "Image URL",
  "form.add": "Add",
  "form.published": "Published",
  "form.saving": "Saving...",
  "form.update": "Update",
  "form.create": "Create",
  "form.cancel": "Cancel",
};
```

- [x] **Step 2: Commit**

```bash
git add src/lib/i18n/en.ts
git commit -m "feat(i18n): add English dictionary"
```

---

## Task 3: Vietnamese dictionary

**Files:**
- Create: `src/lib/i18n/vi.ts`

- [x] **Step 1: Create `src/lib/i18n/vi.ts`**

```typescript
import type { TranslationKey } from "./translations";

export const vi: Record<TranslationKey, string> = {
  "nav.products": "Sản phẩm",
  "nav.cart": "Giỏ hàng",
  "nav.myOrders": "Đơn hàng của tôi",
  "nav.adminPanel": "Quản trị",
  "nav.signOut": "Đăng xuất",
  "nav.signIn": "Đăng nhập với Google",
  "nav.backToShop": "Về cửa hàng",

  "site.name": "Cửa hàng Lưu niệm",

  "footer.copyright": "Bảo lưu mọi quyền.",

  "home.hero.title": "Quà lưu niệm Việt Nam",
  "home.hero.subtitle": "Quà thủ công độc đáo, giao hàng từ Việt Nam",
  "home.browseAll": "Xem tất cả sản phẩm",
  "home.featured": "Sản phẩm nổi bật",

  "products.title": "Tất cả sản phẩm",
  "products.all": "Tất cả",

  "product.outOfStock": "Hết hàng",
  "product.notFound": "Không tìm thấy sản phẩm",
  "product.backToProducts": "Trở về danh sách",
  "product.addToCart": "Thêm vào giỏ",
  "product.added": "Đã thêm!",
  "product.inStock": "còn hàng",

  "cart.title": "Giỏ hàng",
  "cart.empty": "Giỏ hàng trống.",
  "cart.continueShopping": "Tiếp tục mua sắm",
  "cart.remove": "Xóa",
  "cart.orderSummary": "Tóm tắt đơn hàng",
  "cart.subtotal": "Tạm tính",
  "cart.total": "Tổng cộng",
  "cart.shippingNote": "Phí vận chuyển tính sau",
  "cart.proceedToCheckout": "Tiến hành thanh toán",

  "checkout.title": "Thanh toán",
  "checkout.signInRequired": "Đăng nhập để tiếp tục",
  "checkout.signInMessage": "Bạn cần đăng nhập bằng Google để đặt hàng.",
  "checkout.cartEmpty": "Giỏ hàng trống",
  "checkout.browseProducts": "Xem sản phẩm",
  "checkout.orderSummary": "Tóm tắt đơn hàng",
  "checkout.stockAdjusted": "Một số số lượng đã được điều chỉnh do giới hạn tồn kho.",
  "checkout.fillAllFields": "Vui lòng điền đầy đủ thông tin giao hàng.",
  "checkout.placeOrder": "Đặt hàng",
  "checkout.processing": "Đang xử lý...",
  "checkout.somethingWentWrong": "Đã xảy ra lỗi. Vui lòng thử lại.",
  "checkout.viewMyOrders": "Xem đơn hàng của tôi",

  "shipping.title": "Địa chỉ giao hàng",
  "shipping.fullName": "Họ và tên",
  "shipping.phone": "Số điện thoại",
  "shipping.address": "Địa chỉ",
  "shipping.addressPlaceholder": "Số nhà, tên đường",
  "shipping.district": "Quận/Huyện",
  "shipping.city": "Thành phố",
  "shipping.province": "Tỉnh",

  "payment.title": "Phương thức thanh toán",
  "payment.vietqr.label": "Chuyển khoản ngân hàng (VietQR)",
  "payment.vietqr.desc": "Quét mã QR bằng ứng dụng ngân hàng để thanh toán",
  "payment.momo.label": "MoMo",
  "payment.momo.desc": "Chuyển đến MoMo để hoàn tất thanh toán",

  "qr.scanToPay": "Quét để thanh toán",
  "qr.transferNote": "Nội dung chuyển khoản:",
  "qr.amount": "Số tiền:",
  "qr.afterPayment": "Sau khi thanh toán, đơn hàng sẽ được xác nhận bởi người bán.",

  "orders.title": "Đơn hàng của tôi",
  "orders.signInRequired": "Đăng nhập để xem đơn hàng",
  "orders.noOrders": "Chưa có đơn hàng.",
  "orders.item": "sản phẩm",
  "orders.items": "sản phẩm",

  "order.notFound": "Không tìm thấy đơn hàng",
  "order.payment": "Thanh toán:",
  "order.order": "Đơn hàng:",
  "order.method": "Phương thức:",
  "order.bankTransfer": "Chuyển khoản ngân hàng (VietQR)",
  "order.momo": "MoMo",
  "order.itemsTitle": "Sản phẩm",
  "order.subtotal": "Tạm tính",
  "order.shipping": "Phí giao hàng",
  "order.total": "Tổng cộng",
  "order.shippingAddress": "Địa chỉ giao hàng",

  "timeline.orderPlaced": "Đã đặt hàng",
  "timeline.confirmed": "Đã xác nhận",
  "timeline.shipping": "Đang giao hàng",
  "timeline.delivered": "Đã giao hàng",
  "timeline.cancelled": "Đơn hàng đã hủy",

  "status.pending": "Chờ xử lý",
  "status.confirmed": "Đã xác nhận",
  "status.shipping": "Đang giao",
  "status.delivered": "Đã giao",
  "status.cancelled": "Đã hủy",

  "admin.title": "Quản trị",
  "admin.dashboard": "Tổng quan",
  "admin.products": "Sản phẩm",
  "admin.orders": "Đơn hàng",
  "admin.backToShop": "Về cửa hàng",

  "admin.revenueToday": "Doanh thu hôm nay",
  "admin.ordersToday": "Đơn hàng hôm nay",
  "admin.revenueMonth": "Doanh thu tháng này",
  "admin.pendingPayment": "Chờ thanh toán",
  "admin.pendingLabel": "đang chờ",
  "admin.ordersLabel": "đơn",
  "admin.recentOrders": "Đơn hàng gần đây",
  "admin.topSelling": "Bán chạy nhất",
  "admin.orderStatus": "Trạng thái đơn hàng",

  "admin.colOrder": "Đơn hàng",
  "admin.colAmount": "Số tiền",
  "admin.colPayment": "Thanh toán",
  "admin.colStatus": "Trạng thái",
  "admin.colDate": "Ngày",
  "admin.colName": "Tên",
  "admin.colPrice": "Giá",
  "admin.colStock": "Tồn kho",
  "admin.colActions": "Thao tác",

  "admin.addProduct": "Thêm sản phẩm",
  "admin.newProduct": "Sản phẩm mới",
  "admin.editProduct": "Chỉnh sửa sản phẩm",
  "admin.published": "Đã đăng",
  "admin.draft": "Nháp",
  "admin.edit": "Sửa",
  "admin.delete": "Xóa",
  "admin.deleteConfirm": "Xóa sản phẩm này?",

  "admin.confirmPayment": "Xác nhận thanh toán",
  "admin.markShipping": "Đánh dấu đang giao",
  "admin.markDelivered": "Đánh dấu đã giao",
  "admin.cancel": "Hủy đơn",
  "admin.cancelConfirm": "Hủy đơn hàng này và hoàn trả tồn kho?",
  "admin.shipTo": "Giao đến:",

  "form.productName": "Tên sản phẩm",
  "form.slug": "Slug",
  "form.description": "Mô tả",
  "form.price": "Giá (VND)",
  "form.stock": "Tồn kho",
  "form.category": "Danh mục",
  "form.selectCategory": "Chọn danh mục",
  "form.images": "Ảnh (ảnh đầu là ảnh đại diện)",
  "form.imageUrl": "Đường dẫn ảnh",
  "form.add": "Thêm",
  "form.published": "Đã đăng",
  "form.saving": "Đang lưu...",
  "form.update": "Cập nhật",
  "form.create": "Tạo mới",
  "form.cancel": "Hủy",
};
```

- [x] **Step 2: Verify TypeScript compiles** (both dictionaries must satisfy `Record<TranslationKey, string>` — missing keys are compile errors)

Run: `npm run build`
Expected: no TypeScript errors about missing keys

- [x] **Step 3: Commit**

```bash
git add src/lib/i18n/vi.ts
git commit -m "feat(i18n): add Vietnamese dictionary"
```

---

## Task 4: LocaleProvider and useLocale hook

**Files:**
- Create: `src/lib/i18n/locale-context.tsx`

- [x] **Step 1: Create `src/lib/i18n/locale-context.tsx`**

Pattern mirrors `src/lib/firebase/auth-context.tsx`.

```typescript
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { Locale, TranslationKey } from "./translations";
import { en } from "./en";
import { vi } from "./vi";

const STORAGE_KEY = "souvenir-shop-locale";
const dictionaries = { en, vi };

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "vi",
  setLocale: () => {},
  t: (key) => key,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("vi");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved === "en" || saved === "vi") {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  };

  const t = (key: TranslationKey): string => {
    return dictionaries[locale][key] ?? key;
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
```

- [x] **Step 2: Commit**

```bash
git add src/lib/i18n/locale-context.tsx
git commit -m "feat(i18n): add LocaleProvider and useLocale hook"
```

---

## Task 5: Wire up layout.tsx and format.ts

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/lib/format.ts`

- [x] **Step 1: Update `src/lib/format.ts`** — add optional `locale` param

```typescript
export function formatPrice(amount: number, locale: string = "vi-VN"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date, locale: string = "vi-VN"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
```

Note: existing call sites that don't pass `locale` continue to work unchanged (defaults to `"vi-VN"`).

- [x] **Step 2: Update `src/app/layout.tsx`** — add `LocaleProvider`, change `lang`

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/firebase/auth-context";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Souvenir Shop - Vietnamese Souvenirs",
  description: "Shop unique Vietnamese souvenirs and gifts online",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <AuthProvider>
          <LocaleProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

- [x] **Step 3: Run build to verify no errors**

Run: `npm run build`
Expected: successful compilation

- [x] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/lib/format.ts
git commit -m "feat(i18n): wire LocaleProvider into layout, add locale param to format functions"
```

---

## Task 6: Header — language toggle + string replacement

**Files:**
- Modify: `src/components/layout/Header.tsx`

The toggle button sits **next to the logo** (before the `<nav>`), always visible on mobile and desktop. It shows the language you switch TO: `EN` when in `vi` mode, `VI` when in `en` mode.

- [x] **Step 1: Update `src/components/layout/Header.tsx`**

```typescript
"use client";

import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

export function Header() {
  const { user, loading, signIn, signOut } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const { totalItems } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xl font-bold text-amber-700">
            {t("site.name")}
          </Link>
          <button
            onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
            className="rounded border px-2 py-1 text-xs font-bold text-gray-600 hover:bg-gray-50"
          >
            {locale === "vi" ? "EN" : "VI"}
          </button>
        </div>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/products" className="text-sm text-gray-600 hover:text-gray-900">
            {t("nav.products")}
          </Link>
          <Link href="/cart" className="relative text-sm text-gray-600 hover:text-gray-900">
            {t("nav.cart")}
            {totalItems > 0 && (
              <span className="absolute -right-4 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-xs text-white">
                {totalItems}
              </span>
            )}
          </Link>

          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2"
              >
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <span className="text-sm">{user.displayName}</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 w-48 rounded-lg border bg-white py-1 shadow-lg">
                  <Link
                    href="/orders"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("nav.myOrders")}
                  </Link>
                  {user.isAdmin && (
                    <Link
                      href="/admin"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      {t("nav.adminPanel")}
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      signOut();
                      setMenuOpen(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {t("nav.signOut")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button size="sm" onClick={signIn}>
              {t("nav.signIn")}
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
```

- [x] **Step 2: Start dev server and verify the toggle button appears next to the logo, switches languages**

Run: `npm run dev`
Expected: toggle button shows "EN" initially (default locale is `vi`); clicking switches to English

- [x] **Step 3: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "feat(i18n): add language toggle to Header, translate nav strings"
```

---

## Task 7: Footer and AdminSidebar

**Files:**
- Modify: `src/components/layout/Footer.tsx`
- Modify: `src/components/layout/AdminSidebar.tsx`

- [x] **Step 1: Update `src/components/layout/Footer.tsx`** — add `"use client"` and `useLocale`

```typescript
"use client";

import { useLocale } from "@/lib/i18n/locale-context";

export function Footer() {
  const { t } = useLocale();
  return (
    <footer className="border-t bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} {t("site.name")}. {t("footer.copyright")}</p>
      </div>
    </footer>
  );
}
```

- [x] **Step 2: Update `src/components/layout/AdminSidebar.tsx`** — replace hardcoded strings

Note: `AdminSidebar.tsx` already has `"use client"` on line 1 — do **not** add it again. Only add the `useLocale` import and replace strings.

Replace the `links` array and sidebar heading with translated values. The `links` array must be built inside the component so `t()` is called at render time.

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/locale-context";

export function AdminSidebar() {
  const pathname = usePathname();
  const { t } = useLocale();

  const links = [
    { href: "/admin", label: t("admin.dashboard") },
    { href: "/admin/products", label: t("admin.products") },
    { href: "/admin/orders", label: t("admin.orders") },
  ];

  return (
    <aside className="w-56 border-r bg-gray-50">
      <div className="p-4">
        <h2 className="text-sm font-bold uppercase text-gray-500">{t("admin.title")}</h2>
      </div>
      <nav className="space-y-1 px-2">
        {links.map((link) => {
          const isActive =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-amber-100 text-amber-800"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 border-t px-4 pt-4">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          {t("admin.backToShop")}
        </Link>
      </div>
    </aside>
  );
}
```

- [x] **Step 3: Commit**

```bash
git add src/components/layout/Footer.tsx src/components/layout/AdminSidebar.tsx
git commit -m "feat(i18n): translate Footer and AdminSidebar"
```

---

## Task 8: Home page and product listing page

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/products/page.tsx`

- [x] **Step 1: Update `src/app/page.tsx`** — add `useLocale`, replace 3 strings

Add at top of component body:
```typescript
const { t } = useLocale();
```
Add import: `import { useLocale } from "@/lib/i18n/locale-context";`

Replace:
- `"Vietnamese Souvenirs"` → `{t("home.hero.title")}`
- `"Unique handcrafted gifts shipped from Vietnam"` → `{t("home.hero.subtitle")}`
- `"Browse All Products"` → `{t("home.browseAll")}`
- `"Featured Products"` → `{t("home.featured")}`

- [x] **Step 2: Update `src/app/products/page.tsx`** — add `useLocale`, replace 1 string

Add import and `const { t } = useLocale();` inside component.

Replace:
- `"All Products"` → `{t("products.title")}`

- [x] **Step 3: Commit**

```bash
git add src/app/page.tsx src/app/products/page.tsx
git commit -m "feat(i18n): translate home and product listing pages"
```

---

## Task 9: Product components — CategoryFilter and ProductCard

**Files:**
- Modify: `src/components/products/CategoryFilter.tsx`
- Modify: `src/components/products/ProductCard.tsx`

- [x] **Step 1: Update `src/components/products/CategoryFilter.tsx`**

Add `useLocale` import, `const { t } = useLocale();` inside component.

Replace:
- `"All"` button text → `{t("products.all")}`

- [x] **Step 2: Update `src/components/products/ProductCard.tsx`** — add `"use client"`, locale-aware format

```typescript
"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { locale, t } = useLocale();
  const thumbnail = product.images[0] ?? "/placeholder.png";
  const outOfStock = product.stock <= 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group overflow-hidden rounded-lg border bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={thumbnail}
          alt={product.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded bg-white px-3 py-1 text-sm font-medium text-gray-900">
              {t("product.outOfStock")}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-900">{product.name}</h3>
        <p className="mt-1 text-lg font-semibold text-amber-700">
          {formatPrice(product.price, locale === "vi" ? "vi-VN" : "en-US")}
        </p>
      </div>
    </Link>
  );
}
```

- [x] **Step 3: Commit**

```bash
git add src/components/products/CategoryFilter.tsx src/components/products/ProductCard.tsx
git commit -m "feat(i18n): translate CategoryFilter and ProductCard"
```

---

## Task 10: Product detail page

**Files:**
- Modify: `src/app/products/[slug]/page.tsx`

- [x] **Step 1: Add `useLocale` import and destructure in component**

```typescript
const { locale, t } = useLocale();
```

- [x] **Step 2: Replace hardcoded strings**

- `"Product not found"` → `{t("product.notFound")}`
- `"Back to Products"` (Button) → `{t("product.backToProducts")}`
- `"Out of Stock"` → `{t("product.outOfStock")}`
- `"Add to Cart"` / `"Added!"` → `{added ? t("product.added") : t("product.addToCart")}`
- `` `${product.stock} in stock` `` → `` `${product.stock} ${t("product.inStock")}` ``

- [x] **Step 3: Pass `locale` to `formatPrice`**

```typescript
// Before
{formatPrice(product.price)}
// After
{formatPrice(product.price, locale === "vi" ? "vi-VN" : "en-US")}
```

- [x] **Step 4: Commit**

```bash
git add src/app/products/[slug]/page.tsx
git commit -m "feat(i18n): translate product detail page"
```

---

## Task 11: Cart page + CartItem + CartSummary

**Files:**
- Modify: `src/app/cart/page.tsx`
- Modify: `src/components/cart/CartItem.tsx`
- Modify: `src/components/cart/CartSummary.tsx`

- [x] **Step 1: Update `src/app/cart/page.tsx`**

Add `useLocale` import and `const { t } = useLocale();`.

Replace:
- `"Shopping Cart"` → `{t("cart.title")}`
- `"Your cart is empty."` → `{t("cart.empty")}`
- `"Continue Shopping"` → `{t("cart.continueShopping")}`

- [x] **Step 2: Update `src/components/cart/CartItem.tsx`** — add locale-aware format + translate "Remove"

Add `useLocale` import; destructure `const { locale, t } = useLocale();`

Replace:
- `"Remove"` → `{t("cart.remove")}`
- Both `formatPrice(...)` calls → `formatPrice(..., locale === "vi" ? "vi-VN" : "en-US")`

- [x] **Step 3: Update `src/components/cart/CartSummary.tsx`** — add `"use client"`, locale-aware format, translate all strings

```typescript
"use client";

import { formatPrice } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface CartSummaryProps {
  subtotal: number;
  itemCount: number;
}

export function CartSummary({ subtotal, itemCount }: CartSummaryProps) {
  const { locale, t } = useLocale();
  const fmtLocale = locale === "vi" ? "vi-VN" : "en-US";

  return (
    <div className="rounded-lg border bg-gray-50 p-6">
      <h2 className="text-lg font-medium text-gray-900">{t("cart.orderSummary")}</h2>
      <div className="mt-4 flex justify-between text-sm">
        <span className="text-gray-600">
          {t("cart.subtotal")} ({itemCount} {itemCount === 1 ? t("orders.item") : t("orders.items")})
        </span>
        <span className="font-medium">{formatPrice(subtotal, fmtLocale)}</span>
      </div>
      <div className="mt-4 border-t pt-4">
        <div className="flex justify-between text-base font-medium">
          <span>{t("cart.total")}</span>
          <span className="text-amber-700">{formatPrice(subtotal, fmtLocale)}</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">{t("cart.shippingNote")}</p>
      </div>
      <Link href="/checkout">
        <Button className="mt-4 w-full" size="lg" disabled={itemCount === 0}>
          {t("cart.proceedToCheckout")}
        </Button>
      </Link>
    </div>
  );
}
```

- [x] **Step 4: Commit**

```bash
git add src/app/cart/page.tsx src/components/cart/CartItem.tsx src/components/cart/CartSummary.tsx
git commit -m "feat(i18n): translate cart page and cart components"
```

---

## Task 12: Checkout page + checkout components

**Files:**
- Modify: `src/app/checkout/page.tsx`
- Modify: `src/components/checkout/ShippingForm.tsx`
- Modify: `src/components/checkout/PaymentSelector.tsx`
- Modify: `src/components/checkout/QRDisplay.tsx`

- [x] **Step 1: Update `src/components/checkout/ShippingForm.tsx`**

Add `useLocale` import; destructure `const { t } = useLocale();`

Replace each `label` prop and `placeholder`:
- `"Shipping Address"` → `{t("shipping.title")}`
- `label="Full Name"` → `label={t("shipping.fullName")}`
- `label="Phone Number"` → `label={t("shipping.phone")}`
- `label="Address"` → `label={t("shipping.address")}`
- `placeholder="House number, street name"` → `placeholder={t("shipping.addressPlaceholder")}`
- `label="District"` → `label={t("shipping.district")}`
- `label="City"` → `label={t("shipping.city")}`
- `label="Province"` → `label={t("shipping.province")}`

- [x] **Step 2: Update `src/components/checkout/PaymentSelector.tsx`**

Add `useLocale` import; destructure `const { t } = useLocale();`

Move `options` array inside the component, replacing hardcoded strings:

```typescript
const options: { value: PaymentMethod; label: string; desc: string }[] = [
  {
    value: "vietqr",
    label: t("payment.vietqr.label"),
    desc: t("payment.vietqr.desc"),
  },
  {
    value: "momo",
    label: t("payment.momo.label"),
    desc: t("payment.momo.desc"),
  },
];
```

Replace `"Payment Method"` heading → `{t("payment.title")}`

- [x] **Step 3: Update `src/components/checkout/QRDisplay.tsx`** — add `"use client"`, locale-aware format

```typescript
"use client";

import { formatPrice } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";

interface QRDisplayProps {
  qrUrl: string;
  orderCode: string;
  amount: number;
}

export function QRDisplay({ qrUrl, orderCode, amount }: QRDisplayProps) {
  const { locale, t } = useLocale();
  const fmtLocale = locale === "vi" ? "vi-VN" : "en-US";

  return (
    <div className="rounded-lg border bg-white p-6 text-center">
      <h3 className="text-lg font-medium text-gray-900">{t("qr.scanToPay")}</h3>
      <p className="mt-1 text-sm text-gray-500">
        {t("qr.transferNote")} <span className="font-mono font-bold">{orderCode}</span>
      </p>
      <p className="text-sm text-gray-500">
        {t("qr.amount")} <span className="font-bold text-amber-700">{formatPrice(amount, fmtLocale)}</span>
      </p>
      <div className="mx-auto mt-4 w-64">
        <img src={qrUrl} alt="Payment QR Code" className="w-full" />
      </div>
      <p className="mt-4 text-sm text-gray-500">{t("qr.afterPayment")}</p>
    </div>
  );
}
```

- [x] **Step 4: Update `src/app/checkout/page.tsx`**

Add `useLocale` import; destructure `const { locale, t } = useLocale();`

Replace all hardcoded strings:
- `"Sign in to continue"` → `{t("checkout.signInRequired")}`
- `"You need to sign in with Google to place an order."` → `{t("checkout.signInMessage")}`
- `"Sign In with Google"` (Button) → `{t("nav.signIn")}`
- `"Cart is empty"` → `{t("checkout.cartEmpty")}`
- `"Browse Products"` (Button) → `{t("checkout.browseProducts")}`
- The per-item stock warning messages: replace `setStockWarnings(warnings)` logic — instead of per-item strings, set a single boolean flag and show `t("checkout.stockAdjusted")` when any warning exists.

  Change state declaration from `useState<string[]>([])` to:
  ```typescript
  const [stockAdjusted, setStockAdjusted] = useState(false);
  ```

  Replace the entire `validateStock` function body. **Important: `updateQty` calls must be preserved** — they enforce stock limits before the order is placed:
  ```typescript
  async function validateStock() {
    let anyAdjusted = false;
    for (const item of items) {
      const snap = await getDoc(doc(db, "products", item.productId));
      if (!snap.exists()) continue;
      const stock = snap.data().stock ?? 0;
      if (item.qty > stock) {
        anyAdjusted = true;
        updateQty(item.productId, Math.max(stock, 0));
      }
    }
    setStockAdjusted(anyAdjusted);
  }
  ```

  In JSX, replace the `stockWarnings.map(...)` block with:
  ```tsx
  {stockAdjusted && (
    <p className="text-sm text-amber-600">{t("checkout.stockAdjusted")}</p>
  )}
  ```

- In the `handleSubmit` catch block, replace the hardcoded fallback:
  ```typescript
  // Before
  setError(err instanceof Error ? err.message : "Something went wrong");
  // After
  setError(t("checkout.somethingWentWrong"));
  ```
  Note: API-generated error messages (from `data.error`) remain in English — this is out of scope.

- `"Please fill in all address fields."` → `t("checkout.fillAllFields")`
- `"Place Order"` → `{t("checkout.placeOrder")}`
- `"Processing..."` → `{t("checkout.processing")}`
- `"View My Orders"` (Button) → `{t("checkout.viewMyOrders")}`
- `formatPrice(item.price * item.qty)` in order summary → pass `locale === "vi" ? "vi-VN" : "en-US"` as second arg
- `formatPrice(subtotal)` → same

- [x] **Step 5: Commit**

```bash
git add src/app/checkout/page.tsx src/components/checkout/ShippingForm.tsx src/components/checkout/PaymentSelector.tsx src/components/checkout/QRDisplay.tsx
git commit -m "feat(i18n): translate checkout page and checkout components"
```

---

## Task 13: Orders pages + OrderCard + OrderTimeline

**Files:**
- Modify: `src/app/orders/page.tsx`
- Modify: `src/app/orders/[id]/page.tsx`
- Modify: `src/components/orders/OrderCard.tsx`
- Modify: `src/components/orders/OrderTimeline.tsx`

- [x] **Step 1: Update `src/app/orders/page.tsx`**

Add `useLocale` import; `const { t } = useLocale();`

Replace:
- `"Sign in to view orders"` → `{t("orders.signInRequired")}`
- `"Sign In with Google"` (Button) → `{t("nav.signIn")}`
- `"My Orders"` (h1) → `{t("orders.title")}`
- `"No orders yet."` → `{t("orders.noOrders")}`

- [x] **Step 2: Update `src/components/orders/OrderCard.tsx`** — add `"use client"`, locale-aware format

```typescript
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, formatDate } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Order } from "@/lib/types";

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  const { locale, t } = useLocale();
  const fmtLocale = locale === "vi" ? "vi-VN" : "en-US";
  const itemCount = order.items.length;

  return (
    <Link
      href={`/orders/${order.id}`}
      className="block rounded-lg border p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-bold text-gray-900">
          {order.orderCode}
        </span>
        <span className="text-sm text-gray-500">
          {formatDate(order.createdAt, fmtLocale)}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-2">
          <Badge variant={order.paymentStatus}>{order.paymentStatus}</Badge>
          <Badge variant={order.orderStatus}>{order.orderStatus}</Badge>
        </div>
        <span className="font-medium text-amber-700">
          {formatPrice(order.totalAmount, fmtLocale)}
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        {itemCount} {itemCount === 1 ? t("orders.item") : t("orders.items")}
      </p>
    </Link>
  );
}
```

- [x] **Step 3: Update `src/components/orders/OrderTimeline.tsx`** — add `"use client"`, translate labels

```typescript
"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import type { OrderStatus } from "@/lib/types";

interface OrderTimelineProps {
  currentStatus: OrderStatus;
}

export function OrderTimeline({ currentStatus }: OrderTimelineProps) {
  const { t } = useLocale();

  const steps: { status: OrderStatus; label: string }[] = [
    { status: "pending", label: t("timeline.orderPlaced") },
    { status: "confirmed", label: t("timeline.confirmed") },
    { status: "shipping", label: t("timeline.shipping") },
    { status: "delivered", label: t("timeline.delivered") },
  ];

  if (currentStatus === "cancelled") {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-center">
        <p className="font-medium text-red-700">{t("timeline.cancelled")}</p>
      </div>
    );
  }

  const currentIndex = steps.findIndex((s) => s.status === currentStatus);

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, i) => {
        const isActive = i <= currentIndex;
        return (
          <div key={step.status} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  isActive
                    ? "bg-amber-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {i + 1}
              </div>
              <p
                className={`mt-1 text-xs ${
                  isActive ? "font-medium text-gray-900" : "text-gray-400"
                }`}
              >
                {step.label}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 ${
                  i < currentIndex ? "bg-amber-600" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [x] **Step 4: Update `src/app/orders/[id]/page.tsx`**

Add `useLocale` import; `const { locale, t } = useLocale();`

Replace:
- `"Order not found"` → `{t("order.notFound")}`
- `"Order {order.orderCode}"` → `{t("order.order")} {order.orderCode}`
- `"Payment:"` → `{t("order.payment")}`
- `"Order:"` → `{t("order.order")}`
- `"Method:"` → `{t("order.method")}`
- `"Bank Transfer (VietQR)"` → `{t("order.bankTransfer")}`
- `"MoMo"` → `{t("order.momo")}`
- `"Items"` (h2) → `{t("order.itemsTitle")}`
- `"Subtotal"` → `{t("order.subtotal")}`
- `"Shipping"` → `{t("order.shipping")}`
- `"Total"` → `{t("order.total")}`
- `"Shipping Address"` (h2) → `{t("order.shippingAddress")}`
- All `formatPrice(...)` calls → pass `locale === "vi" ? "vi-VN" : "en-US"`
- `formatDate(order.createdAt)` → `formatDate(order.createdAt, locale === "vi" ? "vi-VN" : "en-US")`

- [x] **Step 5: Commit**

```bash
git add src/app/orders/page.tsx src/app/orders/[id]/page.tsx src/components/orders/OrderCard.tsx src/components/orders/OrderTimeline.tsx
git commit -m "feat(i18n): translate orders pages and order components"
```

---

## Task 14: Admin dashboard + dashboard components

**Files:**
- Modify: `src/app/admin/page.tsx`
- Modify: `src/components/admin/RecentOrdersTable.tsx`
- Modify: `src/components/admin/TopProducts.tsx`
- Modify: `src/components/admin/StatusBreakdown.tsx`

Note: `KPICards.tsx` needs no changes — it renders whatever `label`/`value`/`sub` strings are passed to it.

- [x] **Step 1: Update `src/app/admin/page.tsx`**

Add `useLocale` import; `const { locale, t } = useLocale();`

Replace `kpis` array labels and sub-text templates, and add `locale` to `formatPrice`:

```typescript
const fmtLocale = locale === "vi" ? "vi-VN" : "en-US";

const kpis = [
  { label: t("admin.revenueToday"), value: formatPrice(todayRevenue, fmtLocale) },
  {
    label: t("admin.ordersToday"),
    value: String(todayOrders.length),
    sub: `${todayOrders.filter((o) => o.paymentStatus === "pending").length} ${t("admin.pendingLabel")}`,
  },
  {
    label: t("admin.revenueMonth"),
    value: formatPrice(monthRevenue, fmtLocale),
    sub: `${paidOrders.filter((o) => o.createdAt >= monthStart).length} ${t("admin.ordersLabel")}`,
  },
  {
    label: t("admin.pendingPayment"),
    value: String(orders.filter((o) => o.paymentStatus === "pending").length),
  },
];
```

Replace `"Dashboard"` h1 → `{t("admin.dashboard")}`

- [x] **Step 2: Update `src/components/admin/RecentOrdersTable.tsx`** — add `"use client"`, translate headers + format

```typescript
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, formatDate } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Order } from "@/lib/types";

interface RecentOrdersTableProps {
  orders: Order[];
}

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  const { locale, t } = useLocale();
  const fmtLocale = locale === "vi" ? "vi-VN" : "en-US";

  return (
    <div className="rounded-lg border bg-white">
      <div className="border-b px-4 py-3">
        <h3 className="font-medium text-gray-900">{t("admin.recentOrders")}</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-gray-500">
            <th className="px-4 py-2">{t("admin.colOrder")}</th>
            <th className="px-4 py-2">{t("admin.colAmount")}</th>
            <th className="px-4 py-2">{t("admin.colPayment")}</th>
            <th className="px-4 py-2">{t("admin.colStatus")}</th>
            <th className="px-4 py-2">{t("admin.colDate")}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b last:border-0">
              <td className="px-4 py-2">
                <Link
                  href={`/admin/orders?highlight=${order.id}`}
                  className="font-mono font-medium text-amber-700 hover:underline"
                >
                  {order.orderCode}
                </Link>
              </td>
              <td className="px-4 py-2">{formatPrice(order.totalAmount, fmtLocale)}</td>
              <td className="px-4 py-2">
                <Badge variant={order.paymentStatus}>{order.paymentStatus}</Badge>
              </td>
              <td className="px-4 py-2">
                <Badge variant={order.orderStatus}>{order.orderStatus}</Badge>
              </td>
              <td className="px-4 py-2 text-gray-500">
                {formatDate(order.createdAt, fmtLocale)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [x] **Step 3: Update `src/components/admin/TopProducts.tsx`** — add `"use client"`, translate heading

Add `"use client"`, import `useLocale`, destructure `const { t } = useLocale();`

Replace:
- `"Top Selling"` → `{t("admin.topSelling")}`

- [x] **Step 4: Update `src/components/admin/StatusBreakdown.tsx`** — add `"use client"`, translate heading and status labels dynamically

```typescript
"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { OrderStatus } from "@/lib/types";

interface StatusBreakdownProps {
  counts: Record<OrderStatus, number>;
}

const colors: Record<OrderStatus, string> = {
  pending: "text-yellow-600",
  confirmed: "text-blue-600",
  shipping: "text-purple-600",
  delivered: "text-green-600",
  cancelled: "text-gray-500",
};

const statusKeys: OrderStatus[] = ["pending", "confirmed", "shipping", "delivered", "cancelled"];

export function StatusBreakdown({ counts }: StatusBreakdownProps) {
  const { t } = useLocale();

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-3 font-medium text-gray-900">{t("admin.orderStatus")}</h3>
      <div className="flex flex-wrap gap-3">
        {statusKeys.map((status) => (
          <div key={status} className="rounded-lg border px-3 py-2 text-sm">
            <span className="text-gray-500">
              {t(`status.${status}` as TranslationKey)}{" "}
            </span>
            <span className={`font-bold ${colors[status]}`}>
              {counts[status] ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [x] **Step 5: Commit**

```bash
git add src/app/admin/page.tsx src/components/admin/RecentOrdersTable.tsx src/components/admin/TopProducts.tsx src/components/admin/StatusBreakdown.tsx
git commit -m "feat(i18n): translate admin dashboard and dashboard components"
```

---

## Task 15: Admin products page and ProductForm

**Files:**
- Modify: `src/app/admin/products/page.tsx`
- Modify: `src/components/admin/ProductForm.tsx`

- [x] **Step 1: Update `src/app/admin/products/page.tsx`**

Add `useLocale` import; `const { locale, t } = useLocale();`

Replace:
- `confirm("Delete this product?")` → `confirm(t("admin.deleteConfirm"))`
- `"Edit Product"` / `"New Product"` (h1) → `{editing ? t("admin.editProduct") : t("admin.newProduct")}`
- `"Products"` (h1) → `{t("admin.products")}`
- `"Add Product"` (Button) → `{t("admin.addProduct")}`
- Table headers: `"Name"`, `"Price"`, `"Stock"`, `"Status"`, `"Actions"` → `t("admin.colName")`, `t("admin.colPrice")`, `t("admin.colStock")`, `t("admin.colStatus")`, `t("admin.colActions")`
- `"Published"` badge → `{t("admin.published")}`
- `"Draft"` badge → `{t("admin.draft")}`
- `"Edit"` button → `{t("admin.edit")}`
- `"Delete"` button → `{t("admin.delete")}`
- `formatPrice(product.price)` → `formatPrice(product.price, locale === "vi" ? "vi-VN" : "en-US")`

- [x] **Step 2: Update `src/components/admin/ProductForm.tsx`**

Add `useLocale` import; `const { t } = useLocale();`

Replace all form labels and button text:
- `label="Product Name"` → `label={t("form.productName")}`
- `label="Slug"` → `label={t("form.slug")}`
- `"Description"` label → `{t("form.description")}`
- `label="Price (VND)"` → `label={t("form.price")}`
- `label="Stock"` → `label={t("form.stock")}`
- `"Category"` label → `{t("form.category")}`
- `<option value="">Select category</option>` → `<option value="">{t("form.selectCategory")}</option>`
- `"Images (first is thumbnail)"` label → `{t("form.images")}`
- `placeholder="Image URL"` → `placeholder={t("form.imageUrl")}`
- `"Add"` (Button) → `{t("form.add")}`
- `"Published"` (checkbox label) → `{t("form.published")}`
- Button text: `{saving ? "Saving..." : product ? "Update" : "Create"}` → `{saving ? t("form.saving") : product ? t("form.update") : t("form.create")}`
- `"Cancel"` (Button) → `{t("form.cancel")}`

- [x] **Step 3: Commit**

```bash
git add src/app/admin/products/page.tsx src/components/admin/ProductForm.tsx
git commit -m "feat(i18n): translate admin products page and ProductForm"
```

---

## Task 16: Admin orders page and OrderActions

**Files:**
- Modify: `src/app/admin/orders/page.tsx`
- Modify: `src/components/admin/OrderActions.tsx`

- [x] **Step 1: Update `src/app/admin/orders/page.tsx`**

Add `useLocale` import; `const { locale, t } = useLocale();`

Replace:
- `confirm("Cancel this order and restore stock?")` → `confirm(t("admin.cancelConfirm"))`
- `"Orders"` (h1) → `{t("admin.orders")}`
- `"Ship to:"` → `{t("admin.shipTo")}`
- `"VietQR"` / `"MoMo"` payment method label: no change needed (these are brand names displayed as-is)
- `formatPrice(order.totalAmount)` → pass `locale === "vi" ? "vi-VN" : "en-US"`
- `formatDate(order.createdAt)` → pass locale

- [x] **Step 2: Update `src/components/admin/OrderActions.tsx`**

Add `useLocale` import; `const { t } = useLocale();`

Replace:
- `"Confirm Payment"` → `{t("admin.confirmPayment")}`
- `"Mark Shipping"` → `{t("admin.markShipping")}`
- `"Mark Delivered"` → `{t("admin.markDelivered")}`
- `"Cancel"` → `{t("admin.cancel")}`

- [x] **Step 3: Commit**

```bash
git add src/app/admin/orders/page.tsx src/components/admin/OrderActions.tsx
git commit -m "feat(i18n): translate admin orders page and OrderActions"
```

---

## Task 17: Final verification

- [x] **Step 1: Run production build**

Run: `npm run build`
Expected: build succeeds with no TypeScript or compilation errors

- [x] **Step 2: Smoke test in browser**

Run: `npm run dev`

Check:
1. Default locale is Vietnamese (all text in Vietnamese, toggle shows "EN")
2. Click "EN" — all text switches to English, toggle shows "VI"
3. Reload page — English persists (localStorage)
4. Click "VI" — switches back to Vietnamese
5. Navigate through: home → products → product detail → cart → checkout → orders
6. Check admin panel: dashboard KPIs, product table, orders table
7. Prices formatted correctly in both locales (e.g. `₫100,000` in vi-VN vs `₫100,000` in en-US — both use VND)

- [x] **Step 3: Commit any final fixes**

```bash
git add -p
git commit -m "fix(i18n): address any issues found during smoke test"
```
