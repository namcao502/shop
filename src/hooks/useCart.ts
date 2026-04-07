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
