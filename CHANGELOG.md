# Changelog

All notable changes to this project are documented here.

## [Unreleased]

## 2026-04-15

### Added
- Site-wide discount feature with admin settings panel

### Changed
- Dark mode support across various components and pages

### Docs
- Price discount feature design spec and implementation plan

---

## 2026-04-14

### Added
- ThemeContext with hue, rainbow state, and localStorage persistence
- ThemePicker component with hue slider and rainbow toggle
- ThemePicker in header; theme-accent applied to cart badge and NotificationBell
- `--theme-hue` CSS variable, HSL gradient, and theme utility classes
- Rainbow mode enabled by default
- Stronger theme color on header, footer, and admin sidebar surfaces

### Fixed
- Rainbow modulo off-by-one; guard `setHue` when rainbow is active
- Use `background-color` instead of `background` shorthand in `.theme-accent`
- Apply theme-accent to mobile menu panel cart badge
- Lazy-evaluate env vars to avoid module-load-time failures during Next.js static analysis

### Security
- Security and workflow fixes across multiple areas (input validation, auth hardening)

---

## 2026-04-13

### Added
- Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- `payment_failed` notification type
- Centralized and validated required env vars at startup

### Fixed
- Harden MoMo callback: validate payload types, verify amount, transactional failure handling
- VietQR amount fetched from Firestore instead of trusting client input
- Runtime validation for VietQR amount and env vars
- Restrict product image uploads to authenticated admin users only
- Recalculate `shippingFee` and `totalAmount` when province changes in `update_address`
- Reset `createdOrderId` before each checkout submission attempt
- Redirect instead of hanging when admin auth check times out
- Safe subtotal type check in `update_address`; typed `httpError` helper in DELETE

### Performance
- Skip Firestore user read in `verifyAuth` for non-admin routes

---

## 2026-04-10

### Added
- Shipping fee calculation utility (`src/lib/shipping.ts`)
- Real-time shipping fee display in checkout order summary
- Server-side shipping fee calculation when creating orders
- `checkout.shippingFree` translation key (vi/en)

### Fixed
- Hide total row in checkout summary until province is selected
- Remove stale shipping note from cart summary
- Correct Vietnamese diacritics for `checkout.shippingFree`

---

## 2026-04-09

### Added
- User order actions: cancel, update address, delete
- Notifications hook and context for user notification management
- Drag-and-drop image upload for admin product form
- Mobile-responsive header and admin UI
- i18n translation keys for user order management

### Fixed
- Show success message after cancel and address update
- Guard null token; handle `fetchOrder` errors; fix `exhaustive-deps` lint warning
- Handle malformed request body in order API; guard `update_address` with transaction
- Separate reads before writes in cancel order transaction
- Image uploader Storage integration and broken thumbnail fallback
- Cart state sync after product form interactions

---

## 2026-04-08

### Added
- Vietnamese/English language toggle (i18n)

### Changed
- Dependency updates and general styling improvements

---

## 2026-04-07 — Initial Release

### Added
- Next.js 15 App Router project scaffold with Tailwind CSS and Firebase dependencies
- Shared TypeScript types for all Firestore collections (`src/lib/types.ts`)
- Firebase client and Admin SDK configuration
- Auth provider with Google sign-in and server-side token verification
- Next.js middleware for admin route matching
- Shared UI components: Button, Input, Badge; layout: Header, Footer
- Cart logic with localStorage persistence and `useCart` hook
- Home page and product listing page with category filter
- Product detail page with image gallery and add-to-cart
- Cart page with item management and order summary
- Checkout page with stock validation, shipping form, VietQR/MoMo payment
- VietQR and MoMo payment API routes with HMAC webhook verification
- Order creation API with atomic stock transaction and `orderCode` generation
- Customer order list and detail pages with status timeline
- Admin layout with auth guard, dashboard KPIs, recent orders, top products
- Admin product management with full CRUD and image upload
- Admin order management with payment confirmation and stock restore on cancel
- Firestore security rules protecting admin fields and order writes
- Seed script for categories, sample products, and order counter
