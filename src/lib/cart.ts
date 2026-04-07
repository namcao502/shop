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
