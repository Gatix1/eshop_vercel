"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart-provider";

export function CartLink() {
  const { items } = useCart();
  const count = items.reduce((total, item) => total + item.quantity, 0);
  return <Link aria-label={`Shopping bag${count ? `, ${count} items` : ""}`} href="/cart" className="relative grid size-10 place-items-center rounded-full border border-white/10 text-mist transition hover:border-acid hover:text-acid"><ShoppingBag size={17} strokeWidth={1.5} />{count ? <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-acid text-[9px] font-bold text-ink">{count > 9 ? "9+" : count}</span> : null}</Link>;
}
