# UI Polish Design Spec — Home Page & Admin Dashboard

**Date:** 2026-04-08  
**Approach:** B — Premium Minimal (clean & modern, unified design language)  
**Audience:** First-time visitors on the shop; solo admin with occasional delegation

---

## Goals

- Eliminate visual inconsistency between shop and admin — both must feel like one product
- Upgrade the home page to convert first-time visitors faster (clearer hierarchy, trust signal)
- Make the admin dashboard pleasant to use daily without overbuilding

---

## Design System Foundation

Applied globally via `globals.css` `@theme` block and Tailwind utilities. No new abstractions — all components use Tailwind classes directly.

| Token | Value |
|---|---|
| Font | Inter (via `next/font/google`) replaces Arial |
| Text primary | `stone-900` (#1c1917) — warmer than gray-900 |
| Text secondary | `stone-500` (#78716c) |
| Text muted | `stone-400` (#a8a29e) |
| Accent | `amber-600` (#d97706) unchanged |
| Page background | `linear-gradient(160deg, #fffbeb 0%, #fef3c7 40%, #f5f0eb 100%)` — warm amber gradient on both shop and admin |
| Card style | `bg-white shadow-sm rounded-xl` — border removed |
| Card hover | `hover:shadow-md hover:-translate-y-0.5 transition-all` |
| Glass panel | `bg-white/70 backdrop-blur-md rounded-xl shadow-sm border border-white/90` — for sections floating over gradient |
| Shadow scale | `shadow-sm` default / `shadow-md` hover / `shadow-lg` modals |
| Border radius cards | `rounded-xl` |
| Border radius buttons/inputs | `rounded-lg` (unchanged) |

---

## Header (`src/components/layout/Header.tsx`)

- Add `sticky top-0 z-50 backdrop-blur-sm bg-white/90` — floats above gradient
- Logo: `font-bold text-stone-900` with amber underline on hover
- Lang toggle: `rounded-full` pill instead of square border; background `bg-amber-50 text-amber-800`
- Sign-in button: add `shadow-md` to existing amber style

---

## Home Page (`src/app/page.tsx`)

### Hero section
- Remove flat `bg-amber-50` — page background gradient handles the warmth
- Headline: `text-5xl font-extrabold tracking-tight text-stone-900` (from `text-4xl font-bold`)
- Subtitle: `text-stone-500`
- CTA button: add amber glow via inline style `style={{ boxShadow: '0 4px 14px rgba(217,119,6,0.4)' }}`
- Add trust line below button: `text-sm text-stone-400` — "Free shipping on orders over ₫500,000"

### Featured products section
- Wrap in glass panel: `bg-white/55 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-sm mx-4`
- Section heading: `text-2xl font-extrabold tracking-tight text-stone-900`
- Add amber underline accent: `<div class="w-7 h-0.5 bg-amber-500 rounded mt-1 mb-4">`

### Product Cards (`src/components/products/ProductCard.tsx`)
- Remove `border`, replace with `shadow-sm rounded-xl`
- Hover: `hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`
- Price: `font-bold text-amber-600` (from `font-semibold`)
- Product name: `text-stone-900`

---

## Admin Sidebar (`src/components/layout/AdminSidebar.tsx`)

- Background: `bg-white/75 backdrop-blur-md` (glass over gradient) with `border-r border-stone-100/90`
- Section label: `text-stone-400 text-xs uppercase tracking-widest`
- Active link: replace `bg-amber-100 text-amber-800` with `bg-amber-500/10 text-amber-800 border-l-2 border-amber-500`
- Inactive link hover: `hover:bg-stone-50 text-stone-600`
- Nav items: add emoji icons (📊 Dashboard, 📦 Products, 🧾 Orders)
- "Back to shop": `text-stone-400 hover:text-stone-600` with `←` prefix

---

## Admin Dashboard (`src/app/admin/page.tsx` + `src/components/admin/KPICards.tsx`)

### Page heading
- `text-2xl font-extrabold tracking-tight text-stone-900`
- Add `border-b border-stone-100/90 pb-4 mb-6` separator under heading

### KPI Cards (`KPICards.tsx`)
- Remove `border`, add `rounded-xl shadow-sm`
- Add top accent border per card:
  - Revenue Today: `border-t-2 border-amber-500`
  - Pending Payment: `border-t-2 border-amber-300` with value in `text-amber-600`
  - Others: `border-t-2 border-stone-200`
- Label: `text-stone-400 text-xs uppercase tracking-widest font-semibold`
- Value: `text-stone-900 text-2xl font-extrabold tracking-tight`
- Sub: `text-stone-400 text-xs`

### Dashboard section wrappers
- `RecentOrdersTable`, `TopProducts`, `StatusBreakdown` each wrapped in glass panel: `bg-white/70 backdrop-blur-md rounded-xl shadow-sm p-4 border border-white/90`

### Order status badges
- `RecentOrdersTable` already uses `<Badge>` component — no structural change needed
- Update `Badge.tsx` variant styles to align with design tokens:
  - `pending`: `bg-amber-100 text-amber-800` (from yellow)
  - `cancelled`: `bg-red-100 text-red-700` (from gray)
  - All others unchanged

---

## Files Changed

| File | Change |
|---|---|
| `src/app/globals.css` | Add gradient + `min-height: 100vh` + `background-attachment: fixed` on `body` |
| `src/app/layout.tsx` | Inter font already loaded — no change needed |
| `src/components/layout/Header.tsx` | Sticky + blur, logo style, lang toggle pill, button shadow |
| `src/app/page.tsx` | Hero section — remove flat bg, update typography, add trust line, wrap products in glass panel |
| `src/components/products/ProductCard.tsx` | Remove border, add shadow, hover lift, updated text tokens |
| `src/components/layout/AdminSidebar.tsx` | Glass bg, active border-l accent, icons, updated text tokens |
| `src/app/admin/page.tsx` | Heading separator, section wrappers |
| `src/components/admin/KPICards.tsx` | Remove border, top accent bar, updated text tokens |
| `src/components/ui/Badge.tsx` | Update `cancelled` to `bg-red-100 text-red-700`; `pending` to `bg-amber-100 text-amber-800` (consistent with amber token) |
| `src/components/admin/RecentOrdersTable.tsx` | Update container: `rounded-xl shadow-sm` (remove `border`), header text to `text-stone-900`, date column to `text-stone-400` |

---

## Out of Scope

- No new pages or routes
- No changes to data fetching logic
- No changes to checkout, cart, or order flows
- No dark mode
- No animations beyond existing hover transitions
