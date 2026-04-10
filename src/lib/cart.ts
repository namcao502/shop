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
  const exists = cart.some((i) => i.productId === item.productId);
  const updated = exists
    ? cart.map((i) =>
        i.productId === item.productId ? { ...i, qty: i.qty + item.qty } : i
      )
    : [...cart, { ...item }];
  saveCart(updated);
  return updated;
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
  const updated = cart.map((i) =>
    i.productId === productId ? { ...i, qty } : i
  );
  saveCart(updated);
  return updated;
}

export function removeFromCart(productId: string): CartItem[] {
  const cart = getCart().filter((i) => i.productId !== productId);
  saveCart(cart);
  return cart;
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY);
}
