"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart-provider";

export function AddToCart({ productId, variantId, name, variantName, sku, price, image, disabled }: { productId: string; variantId?: string; name: string; variantName?: string; sku: string; price: number; image?: string | null; disabled?: boolean }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  return <button type="button" disabled={disabled} onClick={() => { addItem({ productId, variantId, name, variantName, sku, price, image }); setAdded(true); window.setTimeout(() => setAdded(false), 1800); }} className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-acid px-6 text-xs uppercase tracking-[0.16em] text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-mist"><ShoppingBag size={16} />{added ? "Adăugat în coș" : disabled ? "Indisponibil" : "Adaugă în coș"}</button>;
}
