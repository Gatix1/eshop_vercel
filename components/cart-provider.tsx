"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem } from "@/lib/cart";

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "key" | "quantity"> & { quantity?: number }) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "eshop-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) setItems(JSON.parse(stored) as CartItem[]);
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [hydrated, items]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    addItem: (item) => setItems((current) => {
      const key = `${item.productId}:${item.variantId ?? "base"}`;
      const existing = current.find((entry) => entry.key === key);
      if (existing) return current.map((entry) => entry.key === key ? { ...entry, quantity: entry.quantity + (item.quantity ?? 1) } : entry);
      return [...current, { ...item, key, quantity: item.quantity ?? 1 }];
    }),
    updateQuantity: (key, quantity) => setItems((current) => quantity > 0 ? current.map((item) => item.key === key ? { ...item, quantity } : item) : current.filter((item) => item.key !== key)),
    removeItem: (key) => setItems((current) => current.filter((item) => item.key !== key)),
    clear: () => setItems([]),
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
