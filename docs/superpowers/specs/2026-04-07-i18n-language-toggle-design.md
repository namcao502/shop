# i18n Language Toggle Design Spec

## Overview

Add Vietnamese/English language toggle to the souvenir shop. Client-side only (no URL routing), persisted in localStorage, defaulting to Vietnamese. Covers all UI text including admin panel. Product data in Firestore stays single-language.

## Architecture

### New Files

```
src/lib/i18n/
  translations.ts      -- Locale type + TranslationKey type
  en.ts                -- English dictionary
  vi.ts                -- Vietnamese dictionary
  locale-context.tsx   -- LocaleProvider + useLocale() hook
```

### Provider Pattern

Follows the existing `AuthProvider` pattern in `src/lib/firebase/auth-context.tsx`:

- `LocaleProvider` wraps the app inside `layout.tsx`
- `useLocale()` hook returns `{ locale, setLocale, t }`
- `t(key)` takes a `TranslationKey` and returns the translated string
- Falls back to the key itself if translation is missing (development safety)

### State Management

- Default locale: `"vi"` (Vietnamese)
- Persistence: localStorage key `"souvenir-shop-locale"`
- On mount, read saved locale from localStorage
- `setLocale(locale)` updates state + writes to localStorage
- No URL-based routing, no middleware, no server-side locale detection

## Translation Keys

Flat dot-separated keys organized by area. Approximately 110 keys total.

### Key Namespace Inventory

| Namespace | Example Keys | Count |
|-----------|-------------|-------|
| `nav.*` | `nav.products`, `nav.cart`, `nav.myOrders`, `nav.adminPanel`, `nav.signOut`, `nav.signIn`, `nav.backToShop` | 7 |
| `site.*` | `site.name` | 1 |
| `footer.*` | `footer.copyright` | 1 |
| `home.*` | `home.hero.title`, `home.hero.subtitle`, `home.browseAll`, `home.featured` | 4 |
| `products.*` | `products.title`, `products.all` | 2 |
| `product.*` | `product.outOfStock`, `product.notFound`, `product.backToProducts`, `product.addToCart`, `product.added`, `product.inStock` | 6 |
| `cart.*` | `cart.title`, `cart.empty`, `cart.continueShopping`, `cart.remove`, `cart.orderSummary`, `cart.subtotal`, `cart.total`, `cart.shippingNote`, `cart.proceedToCheckout` | 9 |
| `checkout.*` | `checkout.title`, `checkout.signInRequired`, `checkout.signInMessage`, `checkout.cartEmpty`, `checkout.browseProducts`, `checkout.orderSummary`, `checkout.stockAdjusted`, `checkout.fillAllFields`, `checkout.placeOrder`, `checkout.processing`, `checkout.somethingWentWrong`, `checkout.viewMyOrders` | 12 |
| `shipping.*` | `shipping.title`, `shipping.fullName`, `shipping.phone`, `shipping.address`, `shipping.addressPlaceholder`, `shipping.district`, `shipping.city`, `shipping.province` | 8 |
| `payment.*` | `payment.title`, `payment.vietqr.label`, `payment.vietqr.desc`, `payment.momo.label`, `payment.momo.desc` | 5 |
| `qr.*` | `qr.scanToPay`, `qr.transferNote`, `qr.amount`, `qr.afterPayment` | 4 |
| `orders.*` | `orders.title`, `orders.signInRequired`, `orders.noOrders`, `orders.item`, `orders.items` | 5 |
| `order.*` | `order.notFound`, `order.payment`, `order.order`, `order.method`, `order.bankTransfer`, `order.momo`, `order.itemsTitle`, `order.subtotal`, `order.shipping`, `order.total`, `order.shippingAddress` | 11 |
| `timeline.*` | `timeline.orderPlaced`, `timeline.confirmed`, `timeline.shipping`, `timeline.delivered`, `timeline.cancelled` | 5 |
| `admin.*` | Dashboard KPIs, table headers, product/order management labels, form labels | ~30 |
| `status.*` | `status.pending`, `status.confirmed`, `status.shipping`, `status.delivered`, `status.cancelled` | 5 |
| `form.*` | Product form labels and buttons | ~13 |

### Type Safety

Translation keys are defined as a TypeScript type in `translations.ts`. The dictionaries (`en.ts`, `vi.ts`) are typed as `Record<TranslationKey, string>`, so:
- Missing translations cause compile errors
- Typos in `t("key")` calls cause compile errors
- Adding a new key requires adding it to both dictionaries

## Toggle Button

Located in the Header component (`src/components/layout/Header.tsx`), in the nav bar before the "Products" link.

**Behavior**: Shows what language you switch TO:
- In Vietnamese mode: button shows "EN" (click to switch to English)
- In English mode: button shows "VI" (click to switch to Vietnamese)

**Styling**: Small bordered text button matching the nav style:
```
rounded border px-2 py-1 text-xs font-bold
```

No flag icons or dropdown -- simple toggle between two languages.

## Format Functions

`src/lib/format.ts` updated to accept an optional `locale` parameter:

- `formatPrice(amount, locale?)`: Uses `"vi-VN"` or `"en-US"` for number formatting. Currency stays VND in both.
- `formatDate(date, locale?)`: Uses `"vi-VN"` or `"en-US"` for date formatting.

Components that call these functions destructure `locale` from `useLocale()` and pass it through.

## Layout Integration

In `src/app/layout.tsx`:
- `<LocaleProvider>` wraps children inside `<AuthProvider>`
- `<html lang="vi">` (static default matching the default locale)

```
<AuthProvider>
  <LocaleProvider>
    <Header />
    <main>{children}</main>
    <Footer />
  </LocaleProvider>
</AuthProvider>
```

## Files Requiring Modification

### Infrastructure (4 new + 2 modified)

| Action | File | Change |
|--------|------|--------|
| Create | `src/lib/i18n/translations.ts` | Type definitions |
| Create | `src/lib/i18n/en.ts` | English dictionary |
| Create | `src/lib/i18n/vi.ts` | Vietnamese dictionary |
| Create | `src/lib/i18n/locale-context.tsx` | Provider + hook |
| Modify | `src/app/layout.tsx` | Add LocaleProvider, change lang to "vi" |
| Modify | `src/lib/format.ts` | Add optional locale parameter |

### String Replacement (~25 files)

Every file with hardcoded English text gets:
1. `import { useLocale } from "@/lib/i18n/locale-context"`
2. `const { t } = useLocale()` (plus `locale` if using format functions)
3. Hardcoded strings replaced with `t("key")` calls

Files needing `"use client"` directive added: `Footer.tsx`, `CartSummary.tsx`, `ProductCard.tsx`, `OrderCard.tsx`, `OrderTimeline.tsx`, `QRDisplay.tsx`, `RecentOrdersTable.tsx`, `TopProducts.tsx`, `StatusBreakdown.tsx`.

## Scope Boundaries

### In Scope
- All UI labels, headings, buttons, form labels, error messages, status labels
- Admin panel (dashboard, products, orders)
- Format functions (price, date)
- Toggle button in header
- localStorage persistence

### Out of Scope
- Product names/descriptions (stay single-language in Firestore)
- URL-based routing (no /en, /vi paths)
- Server-side locale detection
- Right-to-left support
- Additional languages beyond EN/VI
