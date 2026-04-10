"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { CartItem } from "@/lib/types";
import {
  getCart,
  addToCart as addToCartLib,
  updateCartItemQty as updateQtyLib,
  removeFromCart as removeLib,
  clearCart as clearLib,
} from "@/lib/cart";

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
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

  const totalItems = items.length;
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQty, removeItem, clear, totalItems, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
