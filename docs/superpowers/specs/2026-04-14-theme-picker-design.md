# Theme Picker Design

**Date:** 2026-04-14
**Status:** Approved

## Overview

Add a theme picker button to the left of the notification bell in the site header. Clicking it opens a small popup with two rows: a hue slider (color picker) and a rainbow animation toggle. The selected hue drives both the page background gradient and the primary accent color. The choice persists across page reloads via `localStorage`.

## User-Visible Behavior

### Button

- A small circular button showing a color wheel icon, placed immediately left of `NotificationBell` in both the desktop nav and the mobile right-side bar.
- No label text -- the icon is self-explanatory.
- Outside-click dismisses the popup (same pattern as `NotificationBell`).

### Popup

Opens below the button. Two rows separated by a divider:

**Row 1 -- Color**
- Label: "Color" (small uppercase).
- A horizontal hue slider styled as a full-spectrum gradient strip (red -> yellow -> green -> cyan -> blue -> magenta -> red).
- A circular thumb shows the current hue position.
- Dragging the thumb immediately updates the page theme.
- Disabled (greyed out) while rainbow mode is active.

**Row 2 -- Rainbow**
- Label: "Rainbow" (small uppercase).
- A single button with a gradient background.
  - Inactive state: "Animate" label.
  - Active state: "Animating... (click to stop)" label with a glowing ring.
- Clicking toggles rainbow mode on/off.
- While active, the hue increments by 1 degree every 40ms, cycling through the full spectrum continuously.
- Stopping rainbow mode leaves the hue at whatever value it was animating through at the moment of stopping.

## What the Theme Color Controls

One CSS variable -- `--theme-hue` (integer 0-360) -- drives two visual systems:

1. **Background gradient** (`body::before` in `globals.css`): switches from hardcoded amber hex values to `hsl(var(--theme-hue), ...)` with fixed saturation/lightness. Dark mode equivalents updated the same way.
2. **Accent color**: a new `.theme-accent` CSS utility class in `globals.css` applies `background: hsl(var(--theme-hue), 70%, 40%); color: white`. Applied to:
   - `Button` component primary variant
   - Cart item count badge in the header
   - Active notification left-border highlight in the `NotificationBell` popup
   - (Notification unread count badge stays `bg-red-500` -- red is semantically correct for alerts)

Other `amber-*` Tailwind usages (hover tints, subtle backgrounds, text links) are left as-is. They remain coherent because the page background tint shifts with the theme.

## Architecture

### New files

**`src/lib/theme-context.tsx`**
- React context providing `hue: number`, `rainbow: boolean`, `setHue(h: number): void`, `setRainbow(on: boolean): void`.
- On mount: reads `souvenir-shop-theme-hue` and `souvenir-shop-theme-rainbow` from `localStorage`. Falls back to `hue = 38` (amber), `rainbow = false`.
- Applies hue via `document.documentElement.style.setProperty('--theme-hue', String(hue))` whenever `hue` changes.
- Rainbow mode: `setInterval` at 40ms increments hue by 1 mod 360 and saves to localStorage each tick.
- Clears the interval on unmount or when rainbow is toggled off.
- Exports: `ThemeProvider`, `useTheme`.

**`src/components/layout/ThemePicker.tsx`**
- `"use client"` component.
- Local `open` state + `containerRef` for outside-click dismiss (same pattern as `NotificationBell`).
- Button: circular, color-wheel gradient background (CSS conic-gradient), 28x28px.
- Popup: fixed width 220px, two rows with divider.
  - Hue slider: `<input type="range" min="0" max="360">`, styled to show the spectrum gradient as track, custom thumb. Calls `setHue` on change. Disabled when `rainbow` is true.
  - Rainbow button: calls `setRainbow(!rainbow)`.
- Reads `hue` and `rainbow` from `useTheme()`.

### Modified files

**`src/app/globals.css`**
- Add to `:root`: `--theme-hue: 38;`
- Replace hardcoded hex values in `body::before` gradient with HSL expressions:
  - `hsl(var(--theme-hue), 60%, 99%)` (lightest stop)
  - `hsl(var(--theme-hue), 60%, 95%)` (middle stop)
  - `hsl(var(--theme-hue), 30%, 93%)` (warmest stop)
- Dark mode `body::before` equivalent updated with lower lightness values.
- Add `.theme-accent` utility: `background: hsl(var(--theme-hue), 70%, 40%); color: white;`
- Add `.theme-accent-border` utility: `border-color: hsl(var(--theme-hue), 70%, 45%);`
- Add `.theme-accent-text` utility: `color: hsl(var(--theme-hue), 70%, 38%);`

**`src/app/layout.tsx`**
- Wrap app with `<ThemeProvider>` (alongside existing `AuthProvider`, `CartProvider`, etc.).

**`src/components/layout/Header.tsx`**
- Import and render `<ThemePicker />` immediately left of `<NotificationBell />` in both the desktop `<nav>` block and the mobile right-side `<div>`.

**`src/components/ui/Button.tsx`**
- Primary variant: replace `bg-amber-600 hover:bg-amber-700` with `.theme-accent` class. Hover darkening via `filter: brightness(0.85)` applied with a `hover:brightness-85` Tailwind utility (works on any hue without needing hue-specific hover variants).

**`src/components/layout/NotificationBell.tsx`**
- Active notification left-border: replace `border-l-amber-500` with `theme-accent-border`.
- "Mark as read" link color: replace `text-amber-600` with `theme-accent-text`.

**`src/components/layout/Header.tsx` (badges)**
- Cart count badge: replace `bg-amber-600` with `theme-accent` class.

**`src/components/layout/NotificationBell.tsx` (unread badge)**
- Unread count badge: keep `bg-red-500` -- red is semantically correct for unread alert counts and should not follow the theme hue.

## Persistence

| Key | Value | Default |
|-----|-------|---------|
| `souvenir-shop-theme-hue` | integer string 0-360 | `"38"` |
| `souvenir-shop-theme-rainbow` | `"true"` or `"false"` | `"false"` |

Both keys are written on every hue change and on every rainbow toggle.

## Non-Goals

- Dark mode theming is not changed (dark mode background already exists in globals.css; it gets the same hue var treatment for consistency but is not a new feature).
- No per-component theming -- one global hue, applied uniformly.
- No preset color swatches panel -- just the continuous hue slider and rainbow mode.
- No server-side persistence -- localStorage only.
