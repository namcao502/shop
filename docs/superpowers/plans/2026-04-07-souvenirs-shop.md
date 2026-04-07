# Souvenir Shop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an online souvenir shop with Google sign-in, Firestore database, VietQR/MoMo payments, and an admin panel.

**Architecture:** Next.js 14 App Router with server-side API routes for payment and order logic. Firebase provides auth, database, and file storage. Cart lives in localStorage. Admin routes protected by middleware that verifies Firebase ID tokens via Admin SDK.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Firebase Auth, Firestore, Firebase Storage, Firebase Admin SDK, vietqr.io API, MoMo Payment Gateway

**Spec:** `docs/superpowers/specs/2026-04-07-souvenirs-shop-design.md`

---

## File Structure

```
souvenir-shop/
  src/
    app/
      layout.tsx                          -- root layout, providers (AuthProvider, Toaster)
      page.tsx                            -- home page
      products/
        page.tsx                          -- product listing with category filter
        [slug]/
          page.tsx                        -- product detail
      cart/
        page.tsx                          -- cart review
      checkout/
        page.tsx                          -- shipping form + payment selection
      orders/
        page.tsx                          -- my orders list (auth required)
        [id]/
          page.tsx                        -- order detail + timeline
      admin/
        layout.tsx                        -- admin layout with sidebar nav
        page.tsx                          -- dashboard KPIs
        products/
          page.tsx                        -- product CRUD
        orders/
          page.tsx                        -- order management
      api/
        orders/
          route.ts                        -- POST: create order (stock transaction)
        vietqr/
          route.ts                        -- POST: generate VietQR QR code
        momo/
          create/
            route.ts                      -- POST: create MoMo payment
          callback/
            route.ts                      -- POST: MoMo webhook
    lib/
      firebase/
        config.ts                         -- client Firebase app init
        admin.ts                          -- Firebase Admin SDK init (server only)
        auth-context.tsx                  -- AuthProvider + useAuth hook
      types.ts                            -- shared TypeScript types
      cart.ts                             -- cart localStorage read/write
      format.ts                           -- formatPrice (VND), formatDate
      verify-admin.ts                     -- server-side: verify token + isAdmin check
      order-code.ts                       -- generate orderCode from counter doc
    components/
      layout/
        Header.tsx                        -- nav bar, cart icon, user menu, sign-in/out
        Footer.tsx                        -- simple footer
        AdminSidebar.tsx                  -- admin nav links
      products/
        ProductCard.tsx                   -- product thumbnail card
        ProductGrid.tsx                   -- grid of ProductCards
        CategoryFilter.tsx                -- category pill buttons
      cart/
        CartItem.tsx                      -- single cart row with qty controls
        CartSummary.tsx                   -- subtotal, proceed to checkout
      checkout/
        ShippingForm.tsx                  -- address form fields
        PaymentSelector.tsx               -- VietQR / MoMo radio buttons
        QRDisplay.tsx                     -- shows generated QR image
      orders/
        OrderCard.tsx                     -- order summary card for list view
        OrderTimeline.tsx                 -- status progression visual
      admin/
        KPICards.tsx                      -- 4 stat cards
        RecentOrdersTable.tsx             -- recent orders table
        TopProducts.tsx                   -- top sellers bar list
        StatusBreakdown.tsx               -- order status counts
        ProductForm.tsx                   -- add/edit product form
        OrderActions.tsx                  -- confirm payment, update status buttons
    hooks/
      useCart.ts                          -- cart state hook wrapping lib/cart.ts
    middleware.ts                          -- protect /admin/* routes
  firestore.rules                         -- Firestore security rules
  scripts/
    seed.ts                               -- seed categories + sample products
  .env.local.example                      -- template for environment variables
```

---

## Phase 1: Foundation

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.js`, `src/app/layout.tsx`, `src/app/page.tsx`, `.env.local.example`, `.gitignore`

- [ ] **Step 1: Create Next.js project with TypeScript and Tailwind**

```bash
cd C:/TEST/shop
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Expected: Project scaffolded with `src/app/` directory structure.

- [ ] **Step 2: Install Firebase dependencies**

```bash
npm install firebase firebase-admin
```

- [ ] **Step 3: Create environment variable template**

Create `.env.local.example`:

```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# VietQR
VIETQR_BANK_ID=VCB
VIETQR_ACCOUNT_NUMBER=
VIETQR_ACCOUNT_NAME=

# MoMo
MOMO_PARTNER_CODE=
MOMO_ACCESS_KEY=
MOMO_SECRET_KEY=
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

- [ ] **Step 4: Update .gitignore to include .superpowers and .env.local**

Append to `.gitignore`:

```
.superpowers/
.env.local
```

- [ ] **Step 5: Verify dev server starts**

```bash
npm run dev
```

Expected: Server running at `http://localhost:3000`.

- [ ] **Step 6: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js 14 project with Tailwind and Firebase deps"
```

---

### Task 2: TypeScript Types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Define all shared types**

```typescript
// src/lib/types.ts

export type PaymentMethod = "vietqr" | "momo";
export type PaymentStatus = "pending" | "paid" | "failed";
export type OrderStatus = "pending" | "confirmed" | "shipping" | "delivered" | "cancelled";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  images: string[];
  categoryId: string;
  stock: number;
  isPublished: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  district: string;
  city: string;
  province: string;
}

export interface Order {
  id: string;
  orderCode: string;
  userId: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  isAdmin: boolean;
  createdAt: Date;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  image: string;
  slug: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add shared TypeScript types for all Firestore collections"
```

---

### Task 3: Firebase Configuration

**Files:**
- Create: `src/lib/firebase/config.ts`, `src/lib/firebase/admin.ts`

- [ ] **Step 1: Create client-side Firebase config**

```typescript
// src/lib/firebase/config.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

- [ ] **Step 2: Create server-side Firebase Admin config**

```typescript
// src/lib/firebase/admin.ts
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const apps = getApps();

const app =
  apps.length === 0
    ? initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
            /\\n/g,
            "\n"
          ),
        }),
      })
    : apps[0];

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/firebase/
git commit -m "feat: add Firebase client and Admin SDK configuration"
```

---

### Task 4: Auth System

**Files:**
- Create: `src/lib/firebase/auth-context.tsx`, `src/lib/verify-admin.ts`

- [ ] **Step 1: Create AuthProvider and useAuth hook**

```typescript
// src/lib/firebase/auth-context.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";
import type { AppUser } from "../types";

interface AuthContextValue {
  user: AppUser | null;
  firebaseUser: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  firebaseUser: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  getIdToken: async () => null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userRef = doc(db, "users", fbUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setUser({
            id: fbUser.uid,
            email: data.email,
            displayName: data.displayName,
            photoURL: data.photoURL,
            isAdmin: data.isAdmin ?? false,
            createdAt: data.createdAt?.toDate() ?? new Date(),
          });
        } else {
          const newUser: Omit<AppUser, "id" | "createdAt"> & {
            createdAt: ReturnType<typeof serverTimestamp>;
          } = {
            email: fbUser.email ?? "",
            displayName: fbUser.displayName ?? "",
            photoURL: fbUser.photoURL ?? "",
            isAdmin: false,
            createdAt: serverTimestamp(),
          };
          await setDoc(userRef, newUser);
          setUser({
            id: fbUser.uid,
            email: newUser.email,
            displayName: newUser.displayName,
            photoURL: newUser.photoURL,
            isAdmin: false,
            createdAt: new Date(),
          });
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const getIdToken = async () => {
    if (!firebaseUser) return null;
    return firebaseUser.getIdToken();
  };

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, signIn, signOut, getIdToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 2: Create server-side admin verification helper**

```typescript
// src/lib/verify-admin.ts
import { adminAuth, adminDb } from "./firebase/admin";

interface VerifyResult {
  uid: string;
  isAdmin: boolean;
}

export async function verifyAuth(
  authHeader: string | null
): Promise<VerifyResult | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split("Bearer ")[1];
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    const isAdmin = userDoc.exists ? userDoc.data()?.isAdmin === true : false;
    return { uid: decoded.uid, isAdmin };
  } catch {
    return null;
  }
}

export async function verifyAdminAuth(
  authHeader: string | null
): Promise<string | null> {
  const result = await verifyAuth(authHeader);
  if (!result || !result.isAdmin) return null;
  return result.uid;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/firebase/auth-context.tsx src/lib/verify-admin.ts
git commit -m "feat: add auth provider with Google sign-in and server-side token verification"
```

---

### Task 5: Admin Middleware

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create middleware to protect admin routes**

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    // Admin auth is checked client-side in the admin layout.
    // Middleware ensures the route exists and passes through.
    // Server-side API routes verify tokens independently.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

Note: Full admin auth protection happens in the admin layout component (client-side redirect if not admin) and in API routes (server-side token verification). Next.js middleware cannot call Firebase Admin SDK because it runs in the Edge runtime.

- [ ] **Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add Next.js middleware for admin route matching"
```

---

## Phase 2: Core UI

### Task 6: Utility Functions + Shared UI Components + Layout

**Files:**
- Create: `src/lib/format.ts`, `src/components/ui/Button.tsx`, `src/components/ui/Input.tsx`, `src/components/ui/Badge.tsx`, `src/components/layout/Header.tsx`, `src/components/layout/Footer.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create formatting utilities**

```typescript
// src/lib/format.ts
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
```

- [ ] **Step 2: Create Button component**

```typescript
// src/components/ui/Button.tsx
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-amber-600 text-white hover:bg-amber-700",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-gray-600 hover:bg-gray-100",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 3: Create Input component**

```typescript
// src/components/ui/Input.tsx
import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        className={`rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 ${
          error ? "border-red-500" : ""
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Create Badge component**

```typescript
// src/components/ui/Badge.tsx
interface BadgeProps {
  variant: "pending" | "paid" | "failed" | "confirmed" | "shipping" | "delivered" | "cancelled";
  children: React.ReactNode;
}

const variantStyles: Record<BadgeProps["variant"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipping: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]}`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 5: Create Header component**

```typescript
// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-context";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

export function Header() {
  const { user, loading, signIn, signOut } = useAuth();
  const { totalItems } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold text-amber-700">
          Souvenir Shop
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/products" className="text-sm text-gray-600 hover:text-gray-900">
            Products
          </Link>
          <Link href="/cart" className="relative text-sm text-gray-600 hover:text-gray-900">
            Cart
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
                    My Orders
                  </Link>
                  {user.isAdmin && (
                    <Link
                      href="/admin"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      signOut();
                      setMenuOpen(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button size="sm" onClick={signIn}>
              Sign In with Google
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 6: Create Footer component**

```typescript
// src/components/layout/Footer.tsx
export function Footer() {
  return (
    <footer className="border-t bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Souvenir Shop. All rights reserved.</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 7: Update root layout with AuthProvider, Header, Footer**

Replace `src/app/layout.tsx`:

```typescript
// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/firebase/auth-context";
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
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/format.ts src/components/ src/app/layout.tsx
git commit -m "feat: add shared UI components (Button, Input, Badge) and layout (Header, Footer)"
```

---

### Task 7: Cart Logic

**Files:**
- Create: `src/lib/cart.ts`, `src/hooks/useCart.ts`

- [ ] **Step 1: Create cart localStorage logic**

```typescript
// src/lib/cart.ts
import type { CartItem } from "./types";

const CART_KEY = "souvenir-shop-cart";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(CART_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function addToCart(item: CartItem): CartItem[] {
  const cart = getCart();
  const existing = cart.find((i) => i.productId === item.productId);
  if (existing) {
    existing.qty += item.qty;
  } else {
    cart.push({ ...item });
  }
  saveCart(cart);
  return cart;
}

export function updateCartItemQty(
  productId: string,
  qty: number
): CartItem[] {
  const cart = getCart();
  if (qty <= 0) {
    const filtered = cart.filter((i) => i.productId !== productId);
    saveCart(filtered);
    return filtered;
  }
  const item = cart.find((i) => i.productId === productId);
  if (item) {
    item.qty = qty;
  }
  saveCart(cart);
  return cart;
}

export function removeFromCart(productId: string): CartItem[] {
  const cart = getCart().filter((i) => i.productId !== productId);
  saveCart(cart);
  return cart;
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY);
}
```

- [ ] **Step 2: Create useCart hook**

```typescript
// src/hooks/useCart.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import type { CartItem } from "@/lib/types";
import {
  getCart,
  addToCart as addToCartLib,
  updateCartItemQty as updateQtyLib,
  removeFromCart as removeLib,
  clearCart as clearLib,
} from "@/lib/cart";

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(getCart());
  }, []);

  const addItem = useCallback((item: CartItem) => {
    setItems(addToCartLib(item));
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    setItems(updateQtyLib(productId, qty));
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(removeLib(productId));
  }, []);

  const clear = useCallback(() => {
    clearLib();
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  return { items, addItem, updateQty, removeItem, clear, totalItems, subtotal };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/cart.ts src/hooks/useCart.ts
git commit -m "feat: add cart logic with localStorage persistence and useCart hook"
```

---

## Phase 3: Product Pages

### Task 8: Home Page + Product Listing

**Files:**
- Create: `src/components/products/ProductCard.tsx`, `src/components/products/ProductGrid.tsx`, `src/components/products/CategoryFilter.tsx`, `src/app/products/page.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create ProductCard component**

```typescript
// src/components/products/ProductCard.tsx
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
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
              Out of Stock
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-900">{product.name}</h3>
        <p className="mt-1 text-lg font-semibold text-amber-700">
          {formatPrice(product.price)}
        </p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Create ProductGrid component**

```typescript
// src/components/products/ProductGrid.tsx
import { ProductCard } from "./ProductCard";
import type { Product } from "@/lib/types";

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <p className="py-12 text-center text-gray-500">No products found.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create CategoryFilter component**

```typescript
// src/components/products/CategoryFilter.tsx
"use client";

import type { Category } from "@/lib/types";

interface CategoryFilterProps {
  categories: Category[];
  selected: string | null;
  onSelect: (categoryId: string | null) => void;
}

export function CategoryFilter({
  categories,
  selected,
  onSelect,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          selected === null
            ? "bg-amber-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            selected === cat.id
              ? "bg-amber-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create products listing page**

```typescript
// src/app/products/page.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { ProductGrid } from "@/components/products/ProductGrid";
import { CategoryFilter } from "@/components/products/CategoryFilter";
import type { Product, Category } from "@/lib/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [productsSnap, categoriesSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "products"),
            where("isPublished", "==", true)
          )
        ),
        getDocs(query(collection(db, "categories"), orderBy("order"))),
      ]);

      setProducts(
        productsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product))
      );
      setCategories(
        categoriesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Category))
      );
      setLoading(false);
    }
    fetchData();
  }, []);

  const filtered = selectedCategory
    ? products.filter((p) => p.categoryId === selectedCategory)
    : products;

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square rounded bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">All Products</h1>
      <div className="mb-6">
        <CategoryFilter
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>
      <ProductGrid products={filtered} />
    </div>
  );
}
```

- [ ] **Step 5: Update home page with hero and featured products**

```typescript
// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { ProductGrid } from "@/components/products/ProductGrid";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import type { Product } from "@/lib/types";

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeatured() {
      const snap = await getDocs(
        query(
          collection(db, "products"),
          where("isPublished", "==", true),
          limit(8)
        )
      );
      setFeatured(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    }
    fetchFeatured();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-amber-50 py-16">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="text-4xl font-bold text-gray-900">
            Vietnamese Souvenirs
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Unique handcrafted gifts shipped from Vietnam
          </p>
          <Link href="/products">
            <Button size="lg" className="mt-6">
              Browse All Products
            </Button>
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-6 text-xl font-bold text-gray-900">
          Featured Products
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded bg-gray-200" />
            ))}
          </div>
        ) : (
          <ProductGrid products={featured} />
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/products/ src/app/products/ src/app/page.tsx
git commit -m "feat: add home page, product listing page with category filter"
```

---

### Task 9: Product Detail Page

**Files:**
- Create: `src/app/products/[slug]/page.tsx`

- [ ] **Step 1: Create product detail page**

```typescript
// src/app/products/[slug]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import type { Product } from "@/lib/types";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      const snap = await getDocs(
        query(
          collection(db, "products"),
          where("slug", "==", params.slug),
          where("isPublished", "==", true)
        )
      );
      if (snap.empty) {
        setLoading(false);
        return;
      }
      const doc = snap.docs[0];
      setProduct({ id: doc.id, ...doc.data() } as Product);
      setLoading(false);
    }
    fetchProduct();
  }, [params.slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="aspect-square w-full max-w-md rounded bg-gray-200" />
          <div className="h-8 w-64 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900">Product not found</h1>
        <Button className="mt-4" onClick={() => router.push("/products")}>
          Back to Products
        </Button>
      </div>
    );
  }

  const outOfStock = product.stock <= 0;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      qty,
      image: product.images[0] ?? "",
      slug: product.slug,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Images */}
        <div>
          <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
            <img
              src={product.images[selectedImage] ?? "/placeholder.png"}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`h-16 w-16 overflow-hidden rounded border-2 ${
                    selectedImage === i ? "border-amber-600" : "border-transparent"
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="mt-2 text-3xl font-bold text-amber-700">
            {formatPrice(product.price)}
          </p>
          <p className="mt-4 text-gray-600">{product.description}</p>

          {outOfStock ? (
            <p className="mt-6 text-lg font-medium text-red-600">Out of Stock</p>
          ) : (
            <div className="mt-6 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded border text-gray-600 hover:bg-gray-50"
                >
                  -
                </button>
                <span className="w-8 text-center">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(product.stock, qty + 1))}
                  className="flex h-8 w-8 items-center justify-center rounded border text-gray-600 hover:bg-gray-50"
                >
                  +
                </button>
              </div>
              <Button onClick={handleAddToCart}>
                {added ? "Added!" : "Add to Cart"}
              </Button>
            </div>
          )}

          <p className="mt-4 text-sm text-gray-500">
            {product.stock > 0 ? `${product.stock} in stock` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/products/[slug]/
git commit -m "feat: add product detail page with image gallery and add to cart"
```

---

## Phase 4: Cart, Checkout & Payments

### Task 10: Cart Page

**Files:**
- Create: `src/components/cart/CartItem.tsx`, `src/components/cart/CartSummary.tsx`, `src/app/cart/page.tsx`

- [ ] **Step 1: Create CartItem component**

```typescript
// src/components/cart/CartItem.tsx
"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { CartItem as CartItemType } from "@/lib/types";

interface CartItemProps {
  item: CartItemType;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
}

export function CartItem({ item, onUpdateQty, onRemove }: CartItemProps) {
  return (
    <div className="flex items-center gap-4 border-b py-4">
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded bg-gray-100">
        <img
          src={item.image || "/placeholder.png"}
          alt={item.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex-1">
        <Link
          href={`/products/${item.slug}`}
          className="font-medium text-gray-900 hover:underline"
        >
          {item.name}
        </Link>
        <p className="text-sm text-amber-700">{formatPrice(item.price)}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdateQty(item.productId, item.qty - 1)}
          className="flex h-8 w-8 items-center justify-center rounded border text-gray-600 hover:bg-gray-50"
        >
          -
        </button>
        <span className="w-8 text-center text-sm">{item.qty}</span>
        <button
          onClick={() => onUpdateQty(item.productId, item.qty + 1)}
          className="flex h-8 w-8 items-center justify-center rounded border text-gray-600 hover:bg-gray-50"
        >
          +
        </button>
      </div>
      <p className="w-28 text-right font-medium">
        {formatPrice(item.price * item.qty)}
      </p>
      <button
        onClick={() => onRemove(item.productId)}
        className="text-sm text-red-600 hover:underline"
      >
        Remove
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create CartSummary component**

```typescript
// src/components/cart/CartSummary.tsx
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface CartSummaryProps {
  subtotal: number;
  itemCount: number;
}

export function CartSummary({ subtotal, itemCount }: CartSummaryProps) {
  return (
    <div className="rounded-lg border bg-gray-50 p-6">
      <h2 className="text-lg font-medium text-gray-900">Order Summary</h2>
      <div className="mt-4 flex justify-between text-sm">
        <span className="text-gray-600">Subtotal ({itemCount} items)</span>
        <span className="font-medium">{formatPrice(subtotal)}</span>
      </div>
      <div className="mt-4 border-t pt-4">
        <div className="flex justify-between text-base font-medium">
          <span>Total</span>
          <span className="text-amber-700">{formatPrice(subtotal)}</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Shipping calculated after checkout
        </p>
      </div>
      <Link href="/checkout">
        <Button className="mt-4 w-full" size="lg" disabled={itemCount === 0}>
          Proceed to Checkout
        </Button>
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Create cart page**

```typescript
// src/app/cart/page.tsx
"use client";

import { useCart } from "@/hooks/useCart";
import { CartItem } from "@/components/cart/CartItem";
import { CartSummary } from "@/components/cart/CartSummary";
import Link from "next/link";

export default function CartPage() {
  const { items, updateQty, removeItem, totalItems, subtotal } = useCart();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Shopping Cart</h1>

      {items.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">Your cart is empty.</p>
          <Link
            href="/products"
            className="mt-4 inline-block text-amber-600 hover:underline"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {items.map((item) => (
              <CartItem
                key={item.productId}
                item={item}
                onUpdateQty={updateQty}
                onRemove={removeItem}
              />
            ))}
          </div>
          <div>
            <CartSummary subtotal={subtotal} itemCount={totalItems} />
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/cart/ src/app/cart/
git commit -m "feat: add cart page with item management and order summary"
```

---

### Task 11: Order Creation API Route

**Files:**
- Create: `src/lib/order-code.ts`, `src/app/api/orders/route.ts`

- [ ] **Step 1: Create orderCode generator**

```typescript
// src/lib/order-code.ts
import { adminDb } from "./firebase/admin";
import type { Transaction } from "firebase-admin/firestore";

// Must be called within an existing transaction -- do NOT create a nested transaction.
export async function generateOrderCode(tx: Transaction): Promise<string> {
  const counterRef = adminDb.collection("counters").doc("orders");
  const counterDoc = await tx.get(counterRef);
  let nextVal = 1;

  if (counterDoc.exists) {
    nextVal = (counterDoc.data()?.current ?? 0) + 1;
    tx.update(counterRef, { current: nextVal });
  } else {
    tx.set(counterRef, { current: nextVal });
  }

  return `ORD${String(nextVal).padStart(4, "0")}`;
}
```

- [ ] **Step 2: Create order creation API route**

```typescript
// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAuth } from "@/lib/verify-admin";
import { generateOrderCode } from "@/lib/order-code";
import { FieldValue } from "firebase-admin/firestore";
import type { ShippingAddress, PaymentMethod, OrderItem } from "@/lib/types";

interface CreateOrderBody {
  items: { productId: string; qty: number }[];
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: CreateOrderBody = await request.json();

  if (!body.items?.length || !body.shippingAddress || !body.paymentMethod) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (!["vietqr", "momo"].includes(body.paymentMethod)) {
    return NextResponse.json(
      { error: "Invalid payment method" },
      { status: 400 }
    );
  }

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      // 1. Read all product documents and verify stock
      const productRefs = body.items.map((item) =>
        adminDb.collection("products").doc(item.productId)
      );
      const productDocs = await Promise.all(productRefs.map((ref) => tx.get(ref)));

      const orderItems: OrderItem[] = [];
      let subtotal = 0;

      for (let i = 0; i < body.items.length; i++) {
        const doc = productDocs[i];
        const reqItem = body.items[i];

        if (!doc.exists) {
          throw new Error(`Product ${reqItem.productId} not found`);
        }

        const data = doc.data()!;

        if (!data.isPublished) {
          throw new Error(`Product ${data.name} is not available`);
        }

        if (data.stock < reqItem.qty) {
          throw new Error(
            `Not enough stock for ${data.name}. Available: ${data.stock}`
          );
        }

        // Decrement stock
        tx.update(productRefs[i], { stock: data.stock - reqItem.qty });

        orderItems.push({
          productId: reqItem.productId,
          name: data.name,
          price: data.price,
          qty: reqItem.qty,
        });

        subtotal += data.price * reqItem.qty;
      }

      // 2. Generate order code (within same transaction -- no nesting)
      const orderCode = await generateOrderCode(tx);

      // 3. Create order document
      const orderRef = adminDb.collection("orders").doc();
      const now = FieldValue.serverTimestamp();

      tx.set(orderRef, {
        orderCode,
        userId: authResult.uid,
        items: orderItems,
        shippingAddress: body.shippingAddress,
        subtotal,
        shippingFee: 0,
        totalAmount: subtotal,
        paymentMethod: body.paymentMethod,
        paymentStatus: "pending",
        orderStatus: "pending",
        createdAt: now,
        updatedAt: now,
      });

      return { orderId: orderRef.id, orderCode, subtotal, totalAmount: subtotal };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/order-code.ts src/app/api/orders/
git commit -m "feat: add order creation API with atomic stock transaction and orderCode generation"
```

---

### Task 12: VietQR Payment API Route

**Files:**
- Create: `src/app/api/vietqr/route.ts`

- [ ] **Step 1: Create VietQR QR generation API route**

```typescript
// src/app/api/vietqr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/verify-admin";

export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { amount, orderCode } = await request.json();

  if (!amount || !orderCode) {
    return NextResponse.json(
      { error: "Missing amount or orderCode" },
      { status: 400 }
    );
  }

  const bankId = process.env.VIETQR_BANK_ID;
  const accountNumber = process.env.VIETQR_ACCOUNT_NUMBER;
  const accountName = process.env.VIETQR_ACCOUNT_NAME;

  // vietqr.io image API: generates a QR code image URL
  // Format: https://img.vietqr.io/image/{bankId}-{accountNumber}-<template>.png?amount=X&addInfo=Y&accountName=Z
  const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(orderCode)}&accountName=${encodeURIComponent(accountName ?? "")}`;

  return NextResponse.json({ qrUrl, orderCode, amount });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/vietqr/
git commit -m "feat: add VietQR API route for generating payment QR codes"
```

---

### Task 13: MoMo Payment API Routes

**Files:**
- Create: `src/app/api/momo/create/route.ts`, `src/app/api/momo/callback/route.ts`

- [ ] **Step 1: Create MoMo payment creation route**

```typescript
// src/app/api/momo/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/verify-admin";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId, orderCode, amount } = await request.json();

  if (!orderId || !orderCode || !amount) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const partnerCode = process.env.MOMO_PARTNER_CODE!;
  const accessKey = process.env.MOMO_ACCESS_KEY!;
  const secretKey = process.env.MOMO_SECRET_KEY!;
  const endpoint = process.env.MOMO_ENDPOINT!;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;

  const requestId = `${partnerCode}-${Date.now()}`;
  const redirectUrl = `${baseUrl}/orders/${orderId}`;
  const ipnUrl = `${baseUrl}/api/momo/callback`;
  const orderInfo = `Payment for order ${orderCode}`;
  const requestType = "payWithMethod";
  const extraData = "";
  const autoCapture = true;
  const lang = "vi";

  const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderCode}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const momoBody = {
    partnerCode,
    partnerName: "Souvenir Shop",
    storeId: partnerCode,
    requestId,
    amount,
    orderId: orderCode,
    orderInfo,
    redirectUrl,
    ipnUrl,
    lang,
    requestType,
    autoCapture,
    extraData,
    signature,
  };

  const momoResponse = await fetch(`${endpoint}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(momoBody),
  });

  const momoData = await momoResponse.json();

  if (momoData.resultCode !== 0) {
    return NextResponse.json(
      { error: momoData.message ?? "MoMo payment creation failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ payUrl: momoData.payUrl });
}
```

- [ ] **Step 2: Create MoMo webhook callback route**

```typescript
// src/app/api/momo/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const {
    partnerCode,
    orderId: orderCode,
    requestId,
    amount,
    orderInfo,
    orderType,
    transId,
    resultCode,
    message,
    extraData,
    signature,
  } = body;

  // Verify HMAC signature
  const secretKey = process.env.MOMO_SECRET_KEY!;
  const accessKey = process.env.MOMO_ACCESS_KEY!;

  const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderCode}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${body.payType}&requestId=${requestId}&responseTime=${body.responseTime}&resultCode=${resultCode}&transId=${transId}`;

  const expectedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  if (signature !== expectedSignature) {
    console.error("MoMo webhook signature mismatch", {
      orderCode,
      expected: expectedSignature,
      received: signature,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Find order by orderCode
  const ordersSnap = await adminDb
    .collection("orders")
    .where("orderCode", "==", orderCode)
    .limit(1)
    .get();

  if (ordersSnap.empty) {
    console.error("MoMo webhook: order not found", { orderCode });
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const orderDoc = ordersSnap.docs[0];

  // Idempotent: skip if already paid
  if (orderDoc.data().paymentStatus === "paid") {
    return NextResponse.json({ message: "Already processed" });
  }

  if (resultCode === 0) {
    // Payment successful
    await orderDoc.ref.update({
      paymentStatus: "paid",
      orderStatus: "confirmed",
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    // Payment failed
    console.error("MoMo payment failed", {
      orderCode,
      resultCode,
      message,
      fullPayload: body,
    });
    await orderDoc.ref.update({
      paymentStatus: "failed",
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return NextResponse.json({ message: "OK" });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/momo/
git commit -m "feat: add MoMo payment creation and webhook callback API routes"
```

---

### Task 14: Checkout Page

**Files:**
- Create: `src/components/checkout/ShippingForm.tsx`, `src/components/checkout/PaymentSelector.tsx`, `src/components/checkout/QRDisplay.tsx`, `src/app/checkout/page.tsx`

- [ ] **Step 1: Create ShippingForm component**

```typescript
// src/components/checkout/ShippingForm.tsx
"use client";

import { Input } from "@/components/ui/Input";
import type { ShippingAddress } from "@/lib/types";

interface ShippingFormProps {
  address: ShippingAddress;
  onChange: (address: ShippingAddress) => void;
}

export function ShippingForm({ address, onChange }: ShippingFormProps) {
  const update = (field: keyof ShippingAddress, value: string) => {
    onChange({ ...address, [field]: value });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">Shipping Address</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Full Name"
          value={address.name}
          onChange={(e) => update("name", e.target.value)}
          required
        />
        <Input
          label="Phone Number"
          value={address.phone}
          onChange={(e) => update("phone", e.target.value)}
          required
        />
      </div>
      <Input
        label="Address"
        value={address.address}
        onChange={(e) => update("address", e.target.value)}
        placeholder="House number, street name"
        required
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="District"
          value={address.district}
          onChange={(e) => update("district", e.target.value)}
          required
        />
        <Input
          label="City"
          value={address.city}
          onChange={(e) => update("city", e.target.value)}
          required
        />
        <Input
          label="Province"
          value={address.province}
          onChange={(e) => update("province", e.target.value)}
          required
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create PaymentSelector component**

```typescript
// src/components/checkout/PaymentSelector.tsx
"use client";

import type { PaymentMethod } from "@/lib/types";

interface PaymentSelectorProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
}

export function PaymentSelector({
  selected,
  onSelect,
}: PaymentSelectorProps) {
  const options: { value: PaymentMethod; label: string; desc: string }[] = [
    {
      value: "vietqr",
      label: "Bank Transfer (VietQR)",
      desc: "Scan QR code with your banking app to pay",
    },
    {
      value: "momo",
      label: "MoMo",
      desc: "Redirect to MoMo to complete payment",
    },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium text-gray-900">Payment Method</h2>
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
            selected === opt.value
              ? "border-amber-600 bg-amber-50"
              : "border-gray-200 hover:bg-gray-50"
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value={opt.value}
            checked={selected === opt.value}
            onChange={() => onSelect(opt.value)}
            className="mt-0.5 accent-amber-600"
          />
          <div>
            <p className="font-medium text-gray-900">{opt.label}</p>
            <p className="text-sm text-gray-500">{opt.desc}</p>
          </div>
        </label>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create QRDisplay component**

```typescript
// src/components/checkout/QRDisplay.tsx
interface QRDisplayProps {
  qrUrl: string;
  orderCode: string;
  amount: number;
}

export function QRDisplay({ qrUrl, orderCode, amount }: QRDisplayProps) {
  return (
    <div className="rounded-lg border bg-white p-6 text-center">
      <h3 className="text-lg font-medium text-gray-900">
        Scan to Pay
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        Transfer note: <span className="font-mono font-bold">{orderCode}</span>
      </p>
      <div className="mx-auto mt-4 w-64">
        <img src={qrUrl} alt="Payment QR Code" className="w-full" />
      </div>
      <p className="mt-4 text-sm text-gray-500">
        After payment, your order will be confirmed by the seller.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Create checkout page**

```typescript
// src/app/checkout/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/lib/firebase/auth-context";
import { useCart } from "@/hooks/useCart";
import { ShippingForm } from "@/components/checkout/ShippingForm";
import { PaymentSelector } from "@/components/checkout/PaymentSelector";
import { QRDisplay } from "@/components/checkout/QRDisplay";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/format";
import type { ShippingAddress, PaymentMethod } from "@/lib/types";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading, signIn, getIdToken } = useAuth();
  const { items, subtotal, updateQty, clear } = useCart();
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);

  const [address, setAddress] = useState<ShippingAddress>({
    name: "",
    phone: "",
    address: "",
    district: "",
    city: "",
    province: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("vietqr");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<{
    qrUrl: string;
    orderCode: string;
    amount: number;
  } | null>(null);

  // Validate cart quantities against current stock on page load
  useEffect(() => {
    async function validateStock() {
      const warnings: string[] = [];
      for (const item of items) {
        const snap = await getDoc(doc(db, "products", item.productId));
        if (!snap.exists()) continue;
        const stock = snap.data().stock ?? 0;
        if (item.qty > stock) {
          const adjusted = Math.max(stock, 0);
          if (adjusted === 0) {
            warnings.push(`${item.name} is out of stock and was removed.`);
          } else {
            warnings.push(
              `${item.name} quantity adjusted from ${item.qty} to ${adjusted} (only ${stock} in stock).`
            );
          }
          updateQty(item.productId, adjusted);
        }
      }
      setStockWarnings(warnings);
    }
    if (items.length > 0) {
      validateStock();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900">
          Sign in to continue
        </h1>
        <p className="mt-2 text-gray-500">
          You need to sign in with Google to place an order.
        </p>
        <Button className="mt-4" onClick={signIn}>
          Sign In with Google
        </Button>
      </div>
    );
  }

  if (items.length === 0 && !qrData) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900">Cart is empty</h1>
        <Button className="mt-4" onClick={() => router.push("/products")}>
          Browse Products
        </Button>
      </div>
    );
  }

  const isAddressComplete = Object.values(address).every((v) => v.trim() !== "");

  const handleSubmit = async () => {
    if (!isAddressComplete) {
      setError("Please fill in all address fields.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = await getIdToken();

      // 1. Create order
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
          shippingAddress: address,
          paymentMethod,
        }),
      });

      if (!orderRes.ok) {
        const data = await orderRes.json();
        throw new Error(data.error ?? "Failed to create order");
      }

      const { orderId, orderCode, totalAmount } = await orderRes.json();

      // 2. Handle payment
      if (paymentMethod === "vietqr") {
        const qrRes = await fetch("/api/vietqr", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount: totalAmount, orderCode }),
        });

        if (!qrRes.ok) throw new Error("Failed to generate QR code");

        const qr = await qrRes.json();
        setQrData({ qrUrl: qr.qrUrl, orderCode, amount: totalAmount });
        clear();
      } else {
        // MoMo
        const momoRes = await fetch("/api/momo/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orderId, orderCode, amount: totalAmount }),
        });

        if (!momoRes.ok) throw new Error("Failed to create MoMo payment");

        const { payUrl } = await momoRes.json();
        clear();
        window.location.href = payUrl;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // Show QR code after VietQR order is placed
  if (qrData) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <QRDisplay
          qrUrl={qrData.qrUrl}
          orderCode={qrData.orderCode}
          amount={qrData.amount}
        />
        <Button
          variant="secondary"
          className="mt-4 w-full"
          onClick={() => router.push("/orders")}
        >
          View My Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Checkout</h1>

      <div className="space-y-8">
        {/* Stock warnings */}
        {stockWarnings.length > 0 && (
          <div className="rounded-lg bg-yellow-50 p-4">
            <p className="text-sm font-medium text-yellow-800">Stock adjusted:</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-yellow-700">
              {stockWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Order summary */}
        <div className="rounded-lg border bg-gray-50 p-4">
          <h2 className="text-lg font-medium text-gray-900">Order Summary</h2>
          {items.map((item) => (
            <div
              key={item.productId}
              className="mt-2 flex justify-between text-sm"
            >
              <span className="text-gray-600">
                {item.name} x {item.qty}
              </span>
              <span>{formatPrice(item.price * item.qty)}</span>
            </div>
          ))}
          <div className="mt-3 border-t pt-3 text-right text-lg font-bold text-amber-700">
            {formatPrice(subtotal)}
          </div>
        </div>

        <ShippingForm address={address} onChange={setAddress} />
        <PaymentSelector selected={paymentMethod} onSelect={setPaymentMethod} />

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <Button
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Processing..." : "Place Order"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/checkout/ src/app/checkout/
git commit -m "feat: add checkout page with shipping form, payment selection, and QR display"
```

---

## Phase 5: Customer Order Tracking

### Task 15: Orders List and Detail Pages

**Files:**
- Create: `src/components/orders/OrderCard.tsx`, `src/components/orders/OrderTimeline.tsx`, `src/app/orders/page.tsx`, `src/app/orders/[id]/page.tsx`

- [ ] **Step 1: Create OrderCard component**

```typescript
// src/components/orders/OrderCard.tsx
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, formatDate } from "@/lib/format";
import type { Order } from "@/lib/types";

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
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
          {formatDate(order.createdAt)}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-2">
          <Badge variant={order.paymentStatus}>{order.paymentStatus}</Badge>
          <Badge variant={order.orderStatus}>{order.orderStatus}</Badge>
        </div>
        <span className="font-medium text-amber-700">
          {formatPrice(order.totalAmount)}
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        {order.items.length} item{order.items.length > 1 ? "s" : ""}
      </p>
    </Link>
  );
}
```

- [ ] **Step 2: Create OrderTimeline component**

```typescript
// src/components/orders/OrderTimeline.tsx
import type { OrderStatus } from "@/lib/types";

interface OrderTimelineProps {
  currentStatus: OrderStatus;
}

const steps: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Order Placed" },
  { status: "confirmed", label: "Confirmed" },
  { status: "shipping", label: "Shipping" },
  { status: "delivered", label: "Delivered" },
];

export function OrderTimeline({ currentStatus }: OrderTimelineProps) {
  if (currentStatus === "cancelled") {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-center">
        <p className="font-medium text-red-700">Order Cancelled</p>
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

- [ ] **Step 3: Create orders list page**

```typescript
// src/app/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/lib/firebase/auth-context";
import { OrderCard } from "@/components/orders/OrderCard";
import { Button } from "@/components/ui/Button";
import type { Order } from "@/lib/types";

export default function OrdersPage() {
  const { user, loading: authLoading, signIn } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchOrders() {
      const snap = await getDocs(
        query(
          collection(db, "orders"),
          where("userId", "==", user!.id),
          orderBy("createdAt", "desc")
        )
      );

      setOrders(
        snap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() ?? new Date(),
            updatedAt: data.updatedAt?.toDate() ?? new Date(),
          } as Order;
        })
      );
      setLoading(false);
    }
    fetchOrders();
  }, [user]);

  if (authLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900">Sign in to view orders</h1>
        <Button className="mt-4" onClick={signIn}>
          Sign In with Google
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Orders</h1>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <p className="py-12 text-center text-gray-500">No orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create order detail page**

```typescript
// src/app/orders/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/lib/firebase/auth-context";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, formatDate } from "@/lib/format";
import type { Order } from "@/lib/types";

export default function OrderDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      const snap = await getDoc(doc(db, "orders", params.id as string));
      if (snap.exists()) {
        const data = snap.data();
        setOrder({
          id: snap.id,
          ...data,
          createdAt: data.createdAt?.toDate() ?? new Date(),
          updatedAt: data.updatedAt?.toDate() ?? new Date(),
        } as Order);
      }
      setLoading(false);
    }
    fetchOrder();
  }, [params.id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-gray-200" />
          <div className="h-32 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900">Order not found</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Order {order.orderCode}
        </h1>
        <span className="text-sm text-gray-500">
          {formatDate(order.createdAt)}
        </span>
      </div>

      {/* Timeline */}
      <div className="mb-8 rounded-lg border p-6">
        <OrderTimeline currentStatus={order.orderStatus} />
      </div>

      {/* Status badges */}
      <div className="mb-6 flex gap-3">
        <div>
          <span className="text-xs text-gray-500">Payment:</span>{" "}
          <Badge variant={order.paymentStatus}>{order.paymentStatus}</Badge>
        </div>
        <div>
          <span className="text-xs text-gray-500">Order:</span>{" "}
          <Badge variant={order.orderStatus}>{order.orderStatus}</Badge>
        </div>
        <div>
          <span className="text-xs text-gray-500">Method:</span>{" "}
          <span className="text-sm font-medium">
            {order.paymentMethod === "vietqr" ? "Bank Transfer (VietQR)" : "MoMo"}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-3 font-medium text-gray-900">Items</h2>
        {order.items.map((item, i) => (
          <div
            key={i}
            className="flex justify-between border-b py-2 last:border-0"
          >
            <span className="text-sm text-gray-700">
              {item.name} x {item.qty}
            </span>
            <span className="text-sm font-medium">
              {formatPrice(item.price * item.qty)}
            </span>
          </div>
        ))}
        <div className="mt-3 space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Shipping</span>
            <span>{formatPrice(order.shippingFee)}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span className="text-amber-700">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Shipping address */}
      <div className="mt-4 rounded-lg border p-4">
        <h2 className="mb-2 font-medium text-gray-900">Shipping Address</h2>
        <p className="text-sm text-gray-600">
          {order.shippingAddress.name} - {order.shippingAddress.phone}
        </p>
        <p className="text-sm text-gray-600">
          {order.shippingAddress.address}, {order.shippingAddress.district}
        </p>
        <p className="text-sm text-gray-600">
          {order.shippingAddress.city}, {order.shippingAddress.province}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/orders/ src/app/orders/
git commit -m "feat: add customer order list and detail pages with status timeline"
```

---

## Phase 6: Admin Panel

### Task 16: Admin Layout and Dashboard

**Files:**
- Create: `src/components/layout/AdminSidebar.tsx`, `src/app/admin/layout.tsx`, `src/components/admin/KPICards.tsx`, `src/components/admin/RecentOrdersTable.tsx`, `src/components/admin/TopProducts.tsx`, `src/components/admin/StatusBreakdown.tsx`, `src/app/admin/page.tsx`

- [ ] **Step 1: Create AdminSidebar component**

```typescript
// src/components/layout/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r bg-gray-50">
      <div className="p-4">
        <h2 className="text-sm font-bold uppercase text-gray-500">Admin</h2>
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
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Back to Shop
        </Link>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create admin layout with auth guard**

```typescript
// src/app/admin/layout.tsx
"use client";

import { useAuth } from "@/lib/firebase/auth-context";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <AdminSidebar />
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Create KPICards component**

```typescript
// src/components/admin/KPICards.tsx
import { formatPrice } from "@/lib/format";

interface KPI {
  label: string;
  value: string;
  sub?: string;
}

interface KPICardsProps {
  kpis: KPI[];
}

export function KPICards({ kpis }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="rounded-lg border bg-white p-4">
          <p className="text-xs uppercase text-gray-500">{kpi.label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{kpi.value}</p>
          {kpi.sub && (
            <p className="mt-0.5 text-sm text-gray-500">{kpi.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create RecentOrdersTable component**

```typescript
// src/components/admin/RecentOrdersTable.tsx
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, formatDate } from "@/lib/format";
import type { Order } from "@/lib/types";

interface RecentOrdersTableProps {
  orders: Order[];
}

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  return (
    <div className="rounded-lg border bg-white">
      <div className="border-b px-4 py-3">
        <h3 className="font-medium text-gray-900">Recent Orders</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-gray-500">
            <th className="px-4 py-2">Order</th>
            <th className="px-4 py-2">Amount</th>
            <th className="px-4 py-2">Payment</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Date</th>
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
              <td className="px-4 py-2">{formatPrice(order.totalAmount)}</td>
              <td className="px-4 py-2">
                <Badge variant={order.paymentStatus}>
                  {order.paymentStatus}
                </Badge>
              </td>
              <td className="px-4 py-2">
                <Badge variant={order.orderStatus}>
                  {order.orderStatus}
                </Badge>
              </td>
              <td className="px-4 py-2 text-gray-500">
                {formatDate(order.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Create TopProducts and StatusBreakdown components**

```typescript
// src/components/admin/TopProducts.tsx
interface TopProduct {
  name: string;
  sold: number;
}

interface TopProductsProps {
  products: TopProduct[];
}

export function TopProducts({ products }: TopProductsProps) {
  const maxSold = Math.max(...products.map((p) => p.sold), 1);

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-3 font-medium text-gray-900">Top Selling</h3>
      <div className="space-y-3">
        {products.map((p) => (
          <div key={p.name} className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{p.name}</span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${(p.sold / maxSold) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{p.sold}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

```typescript
// src/components/admin/StatusBreakdown.tsx
import type { OrderStatus } from "@/lib/types";

interface StatusBreakdownProps {
  counts: Record<OrderStatus, number>;
}

const labels: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipping: "Shipping",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const colors: Record<OrderStatus, string> = {
  pending: "text-yellow-600",
  confirmed: "text-blue-600",
  shipping: "text-purple-600",
  delivered: "text-green-600",
  cancelled: "text-gray-500",
};

export function StatusBreakdown({ counts }: StatusBreakdownProps) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-3 font-medium text-gray-900">Order Status</h3>
      <div className="flex flex-wrap gap-3">
        {(Object.keys(labels) as OrderStatus[]).map((status) => (
          <div
            key={status}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <span className="text-gray-500">{labels[status]} </span>
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

- [ ] **Step 6: Create admin dashboard page**

```typescript
// src/app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { KPICards } from "@/components/admin/KPICards";
import { RecentOrdersTable } from "@/components/admin/RecentOrdersTable";
import { TopProducts } from "@/components/admin/TopProducts";
import { StatusBreakdown } from "@/components/admin/StatusBreakdown";
import { formatPrice } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const snap = await getDocs(
        query(collection(db, "orders"), orderBy("createdAt", "desc"))
      );

      const allOrders = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() ?? new Date(),
          updatedAt: data.updatedAt?.toDate() ?? new Date(),
        } as Order;
      });

      setOrders(allOrders);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-32 rounded bg-gray-200" /></div>;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
  const todayOrders = orders.filter((o) => o.createdAt >= todayStart);
  const todayRevenue = paidOrders
    .filter((o) => o.createdAt >= todayStart)
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const monthRevenue = paidOrders
    .filter((o) => o.createdAt >= monthStart)
    .reduce((sum, o) => sum + o.totalAmount, 0);

  // Top products
  const productSales = new Map<string, { name: string; sold: number }>();
  for (const order of paidOrders) {
    for (const item of order.items) {
      const existing = productSales.get(item.productId);
      if (existing) {
        existing.sold += item.qty;
      } else {
        productSales.set(item.productId, { name: item.name, sold: item.qty });
      }
    }
  }
  const topProducts = [...productSales.values()]
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  // Status breakdown
  const statusCounts: Record<OrderStatus, number> = {
    pending: 0,
    confirmed: 0,
    shipping: 0,
    delivered: 0,
    cancelled: 0,
  };
  for (const order of orders) {
    statusCounts[order.orderStatus]++;
  }

  const kpis = [
    { label: "Revenue Today", value: formatPrice(todayRevenue) },
    {
      label: "Orders Today",
      value: String(todayOrders.length),
      sub: `${todayOrders.filter((o) => o.paymentStatus === "pending").length} pending`,
    },
    {
      label: "Revenue This Month",
      value: formatPrice(monthRevenue),
      sub: `${paidOrders.filter((o) => o.createdAt >= monthStart).length} orders`,
    },
    {
      label: "Pending Payment",
      value: String(orders.filter((o) => o.paymentStatus === "pending").length),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <KPICards kpis={kpis} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentOrdersTable orders={orders.slice(0, 10)} />
        </div>
        <div className="space-y-6">
          <TopProducts products={topProducts} />
          <StatusBreakdown counts={statusCounts} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/AdminSidebar.tsx src/app/admin/ src/components/admin/
git commit -m "feat: add admin layout, dashboard with KPIs, recent orders, top products"
```

---

### Task 17: Admin Product Management

**Files:**
- Create: `src/components/admin/ProductForm.tsx`, `src/app/admin/products/page.tsx`

- [ ] **Step 1: Create ProductForm component**

```typescript
// src/components/admin/ProductForm.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Product, Category } from "@/lib/types";

interface ProductFormProps {
  product?: Product;
  categories: Category[];
  onSave: (data: Omit<Product, "id">) => Promise<void>;
  onCancel: () => void;
}

export function ProductForm({
  product,
  categories,
  onSave,
  onCancel,
}: ProductFormProps) {
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [stock, setStock] = useState(product?.stock?.toString() ?? "0");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [isPublished, setIsPublished] = useState(product?.isPublished ?? true);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!product) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      );
    }
  };

  const addImage = () => {
    if (newImageUrl.trim()) {
      setImages([...images, newImageUrl.trim()]);
      setNewImageUrl("");
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setSaving(true);
    await onSave({
      name,
      slug,
      description,
      price: parseInt(price, 10) || 0,
      stock: parseInt(stock, 10) || 0,
      categoryId,
      isPublished,
      images,
    });
    setSaving(false);
  };

  return (
    <div className="space-y-4 rounded-lg border bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Product Name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
        />
        <Input
          label="Slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          rows={3}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="Price (VND)"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <Input
          label="Stock"
          type="number"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Images */}
      <div>
        <label className="text-sm font-medium text-gray-700">
          Images (first is thumbnail)
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative h-16 w-16 overflow-hidden rounded border">
              <img src={img} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute right-0 top-0 bg-red-600 px-1 text-xs text-white"
              >
                x
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            placeholder="Image URL"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <Button variant="secondary" size="sm" onClick={addImage}>
            Add
          </Button>
        </div>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          className="accent-amber-600"
        />
        <span className="text-sm text-gray-700">Published</span>
      </label>

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving..." : product ? "Update" : "Create"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create admin products page**

```typescript
// src/app/admin/products/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { ProductForm } from "@/components/admin/ProductForm";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/format";
import type { Product, Category } from "@/lib/types";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    const [prodSnap, catSnap] = await Promise.all([
      getDocs(collection(db, "products")),
      getDocs(query(collection(db, "categories"), orderBy("order"))),
    ]);

    setProducts(
      prodSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product))
    );
    setCategories(
      catSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Category))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (data: Omit<Product, "id">) => {
    if (editing) {
      await updateDoc(doc(db, "products", editing.id), { ...data });
    } else {
      const ref = doc(collection(db, "products"));
      await setDoc(ref, { ...data });
    }
    setEditing(null);
    setCreating(false);
    await fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await deleteDoc(doc(db, "products", id));
    await fetchData();
  };

  if (loading) {
    return <div className="animate-pulse"><div className="h-64 rounded bg-gray-200" /></div>;
  }

  if (creating || editing) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          {editing ? "Edit Product" : "New Product"}
        </h1>
        <ProductForm
          product={editing ?? undefined}
          categories={categories}
          onSave={handleSave}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <Button onClick={() => setCreating(true)}>Add Product</Button>
      </div>

      <div className="rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-gray-500">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Stock</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b last:border-0">
                <td className="px-4 py-2 font-medium">{product.name}</td>
                <td className="px-4 py-2">{formatPrice(product.price)}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      product.stock < 5 ? "font-bold text-red-600" : ""
                    }
                  >
                    {product.stock}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {product.isPublished ? (
                    <Badge variant="confirmed">Published</Badge>
                  ) : (
                    <Badge variant="cancelled">Draft</Badge>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(product)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ProductForm.tsx src/app/admin/products/
git commit -m "feat: add admin product management with CRUD operations"
```

---

### Task 18: Admin Order Management

**Files:**
- Create: `src/components/admin/OrderActions.tsx`, `src/app/admin/orders/page.tsx`

- [ ] **Step 1: Create OrderActions component**

```typescript
// src/components/admin/OrderActions.tsx
"use client";

import { Button } from "@/components/ui/Button";
import type { Order, OrderStatus, PaymentStatus } from "@/lib/types";

interface OrderActionsProps {
  order: Order;
  onUpdatePayment: (orderId: string, status: PaymentStatus) => Promise<void>;
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onCancel: (orderId: string) => Promise<void>;
}

export function OrderActions({
  order,
  onUpdatePayment,
  onUpdateStatus,
  onCancel,
}: OrderActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {order.paymentStatus === "pending" && (
        <Button
          size="sm"
          onClick={() => onUpdatePayment(order.id, "paid")}
        >
          Confirm Payment
        </Button>
      )}
      {order.orderStatus === "confirmed" && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onUpdateStatus(order.id, "shipping")}
        >
          Mark Shipping
        </Button>
      )}
      {order.orderStatus === "shipping" && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onUpdateStatus(order.id, "delivered")}
        >
          Mark Delivered
        </Button>
      )}
      {order.orderStatus !== "cancelled" &&
        order.orderStatus !== "delivered" && (
          <Button
            size="sm"
            variant="danger"
            onClick={() => onCancel(order.id)}
          >
            Cancel
          </Button>
        )}
    </div>
  );
}
```

- [ ] **Step 2: Create admin orders page**

```typescript
// src/app/admin/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Badge } from "@/components/ui/Badge";
import { OrderActions } from "@/components/admin/OrderActions";
import { formatPrice, formatDate } from "@/lib/format";
import type { Order, OrderStatus, PaymentStatus } from "@/lib/types";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    const snap = await getDocs(
      query(collection(db, "orders"), orderBy("createdAt", "desc"))
    );
    setOrders(
      snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate() ?? new Date(),
          updatedAt: data.updatedAt?.toDate() ?? new Date(),
        } as Order;
      })
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdatePayment = async (
    orderId: string,
    status: PaymentStatus
  ) => {
    await updateDoc(doc(db, "orders", orderId), {
      paymentStatus: status,
      orderStatus: status === "paid" ? "confirmed" : undefined,
      updatedAt: serverTimestamp(),
    });
    await fetchOrders();
  };

  const handleUpdateStatus = async (
    orderId: string,
    status: OrderStatus
  ) => {
    await updateDoc(doc(db, "orders", orderId), {
      orderStatus: status,
      updatedAt: serverTimestamp(),
    });
    await fetchOrders();
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm("Cancel this order and restore stock?")) return;

    // Restore stock via transaction
    await runTransaction(db, async (tx) => {
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists()) return;

      const orderData = orderSnap.data();

      // Restore stock for each item
      for (const item of orderData.items) {
        const productRef = doc(db, "products", item.productId);
        const productSnap = await tx.get(productRef);
        if (productSnap.exists()) {
          const currentStock = productSnap.data().stock ?? 0;
          tx.update(productRef, { stock: currentStock + item.qty });
        }
      }

      tx.update(orderRef, {
        orderStatus: "cancelled",
        updatedAt: serverTimestamp(),
      });
    });

    await fetchOrders();
  };

  if (loading) {
    return <div className="animate-pulse"><div className="h-64 rounded bg-gray-200" /></div>;
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Orders</h1>

      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="rounded-lg border bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-sm font-bold">
                  {order.orderCode}
                </span>
                <span className="ml-3 text-sm text-gray-500">
                  {formatDate(order.createdAt)}
                </span>
              </div>
              <span className="text-lg font-bold text-amber-700">
                {formatPrice(order.totalAmount)}
              </span>
            </div>

            <div className="mt-2 flex gap-2">
              <Badge variant={order.paymentStatus}>
                {order.paymentStatus}
              </Badge>
              <Badge variant={order.orderStatus}>{order.orderStatus}</Badge>
              <span className="text-xs text-gray-500">
                {order.paymentMethod === "vietqr" ? "VietQR" : "MoMo"}
              </span>
            </div>

            <div className="mt-2 text-sm text-gray-600">
              {order.items.map((item, i) => (
                <span key={i}>
                  {item.name} x{item.qty}
                  {i < order.items.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>

            <div className="mt-2 text-xs text-gray-500">
              Ship to: {order.shippingAddress.name},{" "}
              {order.shippingAddress.district}, {order.shippingAddress.city}
            </div>

            <div className="mt-3">
              <OrderActions
                order={order}
                onUpdatePayment={handleUpdatePayment}
                onUpdateStatus={handleUpdateStatus}
                onCancel={handleCancel}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/OrderActions.tsx src/app/admin/orders/
git commit -m "feat: add admin order management with payment confirmation and stock restore on cancel"
```

---

## Phase 7: Security & Seed Data

### Task 19: Firestore Security Rules

**Files:**
- Create: `firestore.rules`

- [ ] **Step 1: Write Firestore security rules**

```
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: check if the requesting user is an admin
    function isAdmin() {
      return request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    // Products and categories: public read, admin write from client
    match /products/{productId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /categories/{categoryId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Orders: users read own; admin read/write all; customer order creation via Admin SDK only
    match /orders/{orderId} {
      allow read: if request.auth != null
        && (resource.data.userId == request.auth.uid || isAdmin());
      allow write: if isAdmin();
    }

    // Users: read own, write non-admin fields only; admin can read all
    match /users/{userId} {
      allow read: if request.auth != null
        && (request.auth.uid == userId || isAdmin());
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['isAdmin', 'createdAt']);
    }

    // Counters: no client access (Admin SDK only)
    match /counters/{counterId} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add firestore.rules
git commit -m "feat: add Firestore security rules protecting admin fields and order writes"
```

---

### Task 20: Seed Data Script

**Files:**
- Create: `scripts/seed.ts`

- [ ] **Step 1: Create seed script for categories and sample products**

```typescript
// scripts/seed.ts
// Run with: npx tsx scripts/seed.ts
// Requires .env.local with Firebase Admin credentials

import { config } from "dotenv";
config({ path: ".env.local" });

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore(app);

const categories = [
  { name: "Keychains", slug: "keychains", order: 1 },
  { name: "Fridge Magnets", slug: "fridge-magnets", order: 2 },
  { name: "Clothing", slug: "clothing", order: 3 },
  { name: "Art & Paintings", slug: "art-paintings", order: 4 },
];

async function seed() {
  console.log("Seeding categories...");

  const categoryIds: Record<string, string> = {};

  for (const cat of categories) {
    const ref = db.collection("categories").doc();
    await ref.set(cat);
    categoryIds[cat.slug] = ref.id;
    console.log(`  Created category: ${cat.name} (${ref.id})`);
  }

  console.log("Seeding products...");

  const products = [
    {
      name: "Ao Dai Keychain",
      slug: "ao-dai-keychain",
      description: "Beautiful miniature ao dai keychain, handcrafted in Hoi An.",
      price: 45000,
      images: ["https://placehold.co/400x400/f59e0b/fff?text=Ao+Dai"],
      categoryId: categoryIds["keychains"],
      stock: 50,
      isPublished: true,
    },
    {
      name: "Conical Hat Fridge Magnet",
      slug: "conical-hat-fridge-magnet",
      description: "Traditional non la (conical hat) fridge magnet made from wood.",
      price: 35000,
      images: ["https://placehold.co/400x400/22c55e/fff?text=Non+La"],
      categoryId: categoryIds["fridge-magnets"],
      stock: 30,
      isPublished: true,
    },
    {
      name: "Vietnam Coffee T-Shirt",
      slug: "vietnam-coffee-tshirt",
      description: "Cotton t-shirt with Vietnamese coffee culture design.",
      price: 250000,
      images: ["https://placehold.co/400x400/3b82f6/fff?text=Coffee+Tee"],
      categoryId: categoryIds["clothing"],
      stock: 20,
      isPublished: true,
    },
    {
      name: "Lotus Watercolor Painting",
      slug: "lotus-watercolor-painting",
      description: "Hand-painted lotus watercolor on rice paper, framed.",
      price: 450000,
      images: ["https://placehold.co/400x400/ec4899/fff?text=Lotus"],
      categoryId: categoryIds["art-paintings"],
      stock: 10,
      isPublished: true,
    },
    {
      name: "Dragon Boat Keychain",
      slug: "dragon-boat-keychain",
      description: "Wooden dragon boat keychain from Ha Long Bay.",
      price: 55000,
      images: ["https://placehold.co/400x400/8b5cf6/fff?text=Dragon+Boat"],
      categoryId: categoryIds["keychains"],
      stock: 25,
      isPublished: true,
    },
  ];

  for (const product of products) {
    const ref = db.collection("products").doc();
    await ref.set(product);
    console.log(`  Created product: ${product.name} (${ref.id})`);
  }

  // Initialize order counter
  await db.collection("counters").doc("orders").set({ current: 0 });
  console.log("  Initialized order counter");

  console.log("Seed complete!");
}

seed().catch(console.error);
```

- [ ] **Step 2: Install tsx for running TypeScript scripts**

```bash
npm install -D tsx dotenv
```

- [ ] **Step 3: Run the seed script (requires .env.local to be configured)**

```bash
npx tsx scripts/seed.ts
```

Expected: Categories and sample products created in Firestore, order counter initialized.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed.ts package.json package-lock.json
git commit -m "feat: add seed script for categories, sample products, and order counter"
```

---

### Task 21: Final Verification

- [ ] **Step 1: Run the dev server and verify all pages load**

```bash
npm run dev
```

Visit each route and verify:
- `/` -- home page with hero and featured products
- `/products` -- product listing with category filter
- `/products/[slug]` -- product detail with add to cart
- `/cart` -- cart with items, qty controls, checkout link
- `/checkout` -- shipping form, payment method, order placement
- `/orders` -- user's order list (requires sign-in)
- `/orders/[id]` -- order detail with timeline
- `/admin` -- dashboard with KPIs (requires admin user)
- `/admin/products` -- product CRUD
- `/admin/orders` -- order management

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit any fixes from verification**

```bash
git add .
git commit -m "fix: address issues found during final verification"
```
