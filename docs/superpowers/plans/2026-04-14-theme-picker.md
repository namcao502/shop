# Theme Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a circular theme-picker button left of the notification bell that opens a popup with a hue slider and a rainbow animation toggle, driving both the page background and accent color via a single CSS variable.

**Architecture:** A `ThemeContext` holds `hue` (0-360) and `rainbow` (bool), applies `--theme-hue` to `:root` on every change, and persists to `localStorage`. `globals.css` derives background gradient and accent utility classes from `--theme-hue`. `ThemePicker` is a self-contained popup component wired into the `Header`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, CSS custom properties (HSL), localStorage

**Spec:** `docs/superpowers/specs/2026-04-14-theme-picker-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/app/globals.css` | Add `--theme-hue` default, HSL background gradient, `.theme-accent` / `.theme-accent-border` / `.theme-accent-text` utilities, hue slider CSS |
| Create | `src/lib/theme-context.tsx` | ThemeContext -- hue + rainbow state, localStorage, CSS var application, rainbow interval |
| Modify | `src/app/layout.tsx` | Wrap providers with `ThemeProvider` |
| Create | `src/components/layout/ThemePicker.tsx` | Palette button + popup (hue slider + rainbow toggle) |
| Modify | `src/components/layout/Header.tsx` | Add `<ThemePicker />` left of `<NotificationBell />` in desktop nav and mobile bar; cart badge uses `.theme-accent` |
| Modify | `src/components/ui/Button.tsx` | Primary variant uses `.theme-accent` + brightness hover |
| Modify | `src/components/layout/NotificationBell.tsx` | Active border uses `.theme-accent-border`; "mark as read" text uses `.theme-accent-text` |

---

## Task 1: CSS Foundation

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace the globals.css content**

Open `src/app/globals.css` and replace its entire content with:

```css
@import "tailwindcss";

/* Tailwind 4: @theme is top-level only */
@theme {
  --color-background: #fef3c7;
  --color-foreground: #171717;
}

/* Runtime theme hue (0-360). Default 38 = amber. Overridden by ThemeContext via JS. */
:root {
  --theme-hue: 38;
}

/* Dark mode: override the CSS vars on :root */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #1c1710;
    --color-foreground: #ededed;
  }
}

body {
  color: var(--color-foreground);
  font-family: Arial, Helvetica, sans-serif;
  min-height: 100dvh;
  position: relative;
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    160deg,
    hsl(var(--theme-hue), 100%, 99%) 0%,
    hsl(var(--theme-hue), 96%, 95%) 40%,
    hsl(var(--theme-hue), 30%, 93%) 100%
  );
}

@media (prefers-color-scheme: dark) {
  body::before {
    background: linear-gradient(
      160deg,
      hsl(var(--theme-hue), 40%, 9%) 0%,
      hsl(var(--theme-hue), 45%, 9%) 40%,
      hsl(var(--theme-hue), 30%, 8%) 100%
    );
  }
}

/* Theme accent utilities -- driven by --theme-hue */
.theme-accent {
  background: hsl(var(--theme-hue), 70%, 40%);
  color: white;
}
.theme-accent-border {
  border-color: hsl(var(--theme-hue), 70%, 45%);
}
.theme-accent-text {
  color: hsl(var(--theme-hue), 70%, 38%);
}

/* Hue slider styling */
input[type="range"].hue-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 20px;
  border-radius: 10px;
  background: linear-gradient(
    to right,
    hsl(0, 80%, 55%),
    hsl(30, 80%, 55%),
    hsl(60, 80%, 55%),
    hsl(90, 80%, 55%),
    hsl(120, 80%, 55%),
    hsl(150, 80%, 55%),
    hsl(180, 80%, 55%),
    hsl(210, 80%, 55%),
    hsl(240, 80%, 55%),
    hsl(270, 80%, 55%),
    hsl(300, 80%, 55%),
    hsl(330, 80%, 55%),
    hsl(360, 80%, 55%)
  );
  border: 1px solid rgba(0, 0, 0, 0.12);
  outline: none;
  cursor: pointer;
}
input[type="range"].hue-slider:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
input[type="range"].hue-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: hsl(var(--theme-hue), 80%, 50%);
  border: 2.5px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  cursor: pointer;
}
input[type="range"].hue-slider::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: hsl(var(--theme-hue), 80%, 50%);
  border: 2.5px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  cursor: pointer;
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd C:/ex-project/shop && npm run build 2>&1 | tail -20
```

Expected: build completes with no TypeScript errors (CSS changes don't affect type checking).

- [ ] **Step 3: Commit**

```bash
cd C:/ex-project/shop
git add src/app/globals.css
git commit -m "feat: add --theme-hue CSS var, HSL gradient, theme utility classes"
```

---

## Task 2: ThemeContext

**Files:**
- Create: `src/lib/theme-context.tsx`

- [ ] **Step 1: Create the file**

Create `src/lib/theme-context.tsx`:

```tsx
"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

const LS_HUE = "souvenir-shop-theme-hue";
const LS_RAINBOW = "souvenir-shop-theme-rainbow";
const DEFAULT_HUE = 38;
const RAINBOW_INTERVAL_MS = 40;

interface ThemeContextValue {
  hue: number;
  rainbow: boolean;
  setHue: (h: number) => void;
  setRainbow: (on: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [hue, setHueState] = useState<number>(DEFAULT_HUE);
  const [rainbow, setRainbowState] = useState<boolean>(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hueRef = useRef<number>(DEFAULT_HUE);

  // Read localStorage on mount (client only)
  useEffect(() => {
    const savedHue = parseInt(localStorage.getItem(LS_HUE) ?? String(DEFAULT_HUE), 10);
    const savedRainbow = localStorage.getItem(LS_RAINBOW) === "true";
    const initialHue = isNaN(savedHue) ? DEFAULT_HUE : Math.max(0, Math.min(360, savedHue));
    hueRef.current = initialHue;
    setHueState(initialHue);
    applyHue(initialHue);
    if (savedRainbow) {
      setRainbowState(true);
    }
  }, []);

  // Apply CSS var whenever hue changes
  useEffect(() => {
    applyHue(hue);
    hueRef.current = hue;
  }, [hue]);

  // Manage rainbow interval
  useEffect(() => {
    if (rainbow) {
      intervalRef.current = setInterval(() => {
        const next = (hueRef.current + 1) % 361;
        hueRef.current = next;
        applyHue(next);
        setHueState(next);
        localStorage.setItem(LS_HUE, String(next));
      }, RAINBOW_INTERVAL_MS);
    } else {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [rainbow]);

  function setHue(h: number) {
    const clamped = Math.max(0, Math.min(360, h));
    setHueState(clamped);
    localStorage.setItem(LS_HUE, String(clamped));
  }

  function setRainbow(on: boolean) {
    setRainbowState(on);
    localStorage.setItem(LS_RAINBOW, String(on));
  }

  return (
    <ThemeContext.Provider value={{ hue, rainbow, setHue, setRainbow }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

function applyHue(hue: number) {
  document.documentElement.style.setProperty("--theme-hue", String(hue));
}
```

- [ ] **Step 2: Build to check types**

```bash
cd C:/ex-project/shop && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd C:/ex-project/shop
git add src/lib/theme-context.tsx
git commit -m "feat: add ThemeContext with hue, rainbow state, and localStorage persistence"
```

---

## Task 3: Wire ThemeProvider into Layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add ThemeProvider**

In `src/app/layout.tsx`, add the import and wrap the existing providers:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/firebase/auth-context";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { ConfirmProvider } from "@/lib/confirm-context";
import { CartProvider } from "@/lib/cart-context";
import { ToastProvider } from "@/lib/toast-context";
import { ThemeProvider } from "@/lib/theme-context";
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
        <ThemeProvider>
          <AuthProvider>
            <LocaleProvider>
              <ConfirmProvider>
                <CartProvider>
                  <ToastProvider>
                    <div className="flex min-h-screen flex-col">
                      <Header />
                      <main className="flex-1">{children}</main>
                      <Footer />
                    </div>
                  </ToastProvider>
                </CartProvider>
              </ConfirmProvider>
            </LocaleProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Build to check types**

```bash
cd C:/ex-project/shop && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd C:/ex-project/shop
git add src/app/layout.tsx
git commit -m "feat: wrap app with ThemeProvider"
```

---

## Task 4: ThemePicker Component

**Files:**
- Create: `src/components/layout/ThemePicker.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/layout/ThemePicker.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme-context";

export function ThemePicker() {
  const { hue, rainbow, setHue, setRainbow } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Palette button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Theme color"
        className="h-7 w-7 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110 active:scale-95"
        style={{
          background:
            "conic-gradient(hsl(0,80%,55%), hsl(60,80%,55%), hsl(120,80%,55%), hsl(180,80%,55%), hsl(240,80%,55%), hsl(300,80%,55%), hsl(360,80%,55%))",
          boxShadow: `0 0 0 2px white, 0 0 0 3.5px hsl(${hue}, 70%, 40%)`,
        }}
      />

      {/* Popup */}
      {open && (
        <div className="absolute right-0 top-9 z-50 w-52 rounded-xl border border-stone-200 bg-white shadow-xl">
          {/* Row 1: Color */}
          <div className="border-b border-stone-100 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
              Color
            </p>
            <input
              type="range"
              min={0}
              max={360}
              value={hue}
              disabled={rainbow}
              onChange={(e) => setHue(Number(e.target.value))}
              className="hue-slider w-full"
            />
          </div>

          {/* Row 2: Rainbow */}
          <div className="px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
              Rainbow
            </p>
            <button
              onClick={() => setRainbow(!rainbow)}
              className="w-full rounded-lg py-2 text-xs font-bold text-white transition-all"
              style={{
                background:
                  "linear-gradient(to right, hsl(0,80%,55%), hsl(60,80%,55%), hsl(120,80%,55%), hsl(180,80%,55%), hsl(240,80%,55%), hsl(300,80%,55%), hsl(360,80%,55%))",
                boxShadow: rainbow
                  ? "0 0 0 2px white, 0 0 0 4px hsl(270,70%,55%), 0 0 12px rgba(180,100,255,.4)"
                  : undefined,
              }}
            >
              {rainbow ? "Animating... (click to stop)" : "Animate"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build to check types**

```bash
cd C:/ex-project/shop && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd C:/ex-project/shop
git add src/components/layout/ThemePicker.tsx
git commit -m "feat: add ThemePicker component with hue slider and rainbow toggle"
```

---

## Task 5: Wire ThemePicker into Header

**Files:**
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Add import and place ThemePicker in both nav bars**

In `src/components/layout/Header.tsx`:

1. Add import at the top (alongside `NotificationBell`):

```tsx
import { ThemePicker } from "@/components/layout/ThemePicker";
```

2. In the **desktop nav** (the `<nav className="hidden items-center gap-6 md:flex">` block), add `<ThemePicker />` immediately before `<NotificationBell />`:

```tsx
<ThemePicker />
<NotificationBell />
```

3. In the **mobile right-side bar** (the `<div className="flex items-center gap-3 md:hidden">` block), add `<ThemePicker />` immediately before `<NotificationBell />`:

```tsx
<ThemePicker />
<NotificationBell />
```

4. Replace the cart count badge class `bg-amber-600` with `theme-accent` in both the desktop cart link and the mobile cart icon (there are two instances in the file):

Desktop cart badge (around line 54-57):
```tsx
<span className="absolute -right-4 -top-2 flex h-5 w-5 items-center justify-center rounded-full theme-accent text-xs text-white">
  {totalItems}
</span>
```

Mobile cart badge (around line 105-108):
```tsx
<span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full theme-accent text-xs text-white">
  {totalItems}
</span>
```

- [ ] **Step 2: Build to check types**

```bash
cd C:/ex-project/shop && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd C:/ex-project/shop
git add src/components/layout/Header.tsx
git commit -m "feat: add ThemePicker to header, apply theme-accent to cart badge"
```

---

## Task 6: Apply Theme Accent to Button

**Files:**
- Modify: `src/components/ui/Button.tsx`

- [ ] **Step 1: Update primary variant**

In `src/components/ui/Button.tsx`, change the `variants` object so the primary entry uses `.theme-accent` and brightness-based hover/active states:

```tsx
const variants = {
  primary: "theme-accent hover:brightness-90 active:brightness-75",
  secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
  ghost: "text-gray-600 hover:bg-gray-100 active:bg-gray-200",
};
```

- [ ] **Step 2: Build to check types**

```bash
cd C:/ex-project/shop && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd C:/ex-project/shop
git add src/components/ui/Button.tsx
git commit -m "feat: Button primary variant uses theme-accent CSS class"
```

---

## Task 7: Apply Theme Utilities to NotificationBell

**Files:**
- Modify: `src/components/layout/NotificationBell.tsx`

- [ ] **Step 1: Replace amber accent usages**

In `src/components/layout/NotificationBell.tsx`, make these targeted replacements:

1. The "Mark all read" button (around line 93) -- replace `text-amber-600 hover:text-amber-700` with `theme-accent-text hover:opacity-80`:

```tsx
<button
  onClick={markAllRead}
  className="text-xs font-semibold theme-accent-text hover:opacity-80"
>
```

2. The unread notification row class (around line 111-114) -- replace `border-l-amber-500 bg-amber-50` with `theme-accent-border bg-stone-50`:

```tsx
className={`border-b border-stone-100 px-4 py-3 last:border-0 ${
  !n.read
    ? "border-l-2 theme-accent-border bg-stone-50"
    : "opacity-70"
}`}
```

3. The "View order" link (around line 139) -- replace `text-amber-600 hover:text-amber-700` with `theme-accent-text hover:opacity-80`:

```tsx
className="mt-1 block text-xs font-semibold theme-accent-text hover:opacity-80"
```

4. The "Mark as read" button on individual items (around line 143-148) -- leave as `text-stone-400 hover:text-stone-600` (this is already neutral, no change needed).

- [ ] **Step 2: Build to check types**

```bash
cd C:/ex-project/shop && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Run dev server and do a full visual check**

```bash
cd C:/ex-project/shop && npm run dev
```

Open `http://localhost:3000` and verify:

- [ ] Background gradient shifts when dragging the hue slider
- [ ] Primary buttons change color with the hue
- [ ] Cart badge follows the hue
- [ ] Rainbow mode animates continuously through the spectrum
- [ ] Stopping rainbow mode leaves the hue at its current position
- [ ] Refreshing the page restores the last hue and rainbow state
- [ ] Notification bell unread badge stays red (not theme-colored)
- [ ] ThemePicker button appears left of bell in both desktop and mobile

- [ ] **Step 4: Commit**

```bash
cd C:/ex-project/shop
git add src/components/layout/NotificationBell.tsx
git commit -m "feat: apply theme-accent utilities to NotificationBell"
```
