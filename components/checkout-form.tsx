"use client";

import { useActionState, useEffect, useState } from "react";
import { createPendingOrder, type CheckoutResult } from "@/app/checkout/actions";
import { useCart } from "@/components/cart-provider";

const initialState: CheckoutResult = {};

export function CheckoutForm({ email }: { email: string }) {
  const { items } = useCart();
  const [state, action, pending] = useActionState(createPendingOrder, initialState);
  const [cart, setCart] = useState("[]");
  useEffect(() => setCart(JSON.stringify(items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })))), [items]);
  return <form action={action} className="space-y-8"><input type="hidden" name="cart" value={cart} /><div className="grid gap-5 sm:grid-cols-2"><label className="text-xs text-mist">Email<input value={email} readOnly className="mt-2 w-full border-b border-white/20 bg-transparent py-3 text-sm text-white outline-none" /></label><label className="text-xs text-mist">Full name<input name="full_name" required className="mt-2 w-full border-b border-white/20 bg-transparent py-3 text-sm text-white outline-none focus:border-acid" /></label><label className="text-xs text-mist">Phone<input name="phone" required type="tel" className="mt-2 w-full border-b border-white/20 bg-transparent py-3 text-sm text-white outline-none focus:border-acid" /></label><label className="text-xs text-mist">City<input name="city" required defaultValue="Chișinău" className="mt-2 w-full border-b border-white/20 bg-transparent py-3 text-sm text-white outline-none focus:border-acid" /></label></div><label className="block text-xs text-mist">Delivery address<textarea name="address" required rows={3} className="mt-2 w-full resize-none border border-white/10 bg-white/[.02] p-3 text-sm text-white outline-none focus:border-acid" /></label><label className="block text-xs text-mist">Notes <span className="text-white/40">(optional)</span><textarea name="notes" rows={3} className="mt-2 w-full resize-none border border-white/10 bg-white/[.02] p-3 text-sm text-white outline-none focus:border-acid" /></label>{state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}<button disabled={pending || !items.length} className="min-h-12 bg-acid px-6 text-xs uppercase tracking-[0.18em] text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-mist">{pending ? "Creating order..." : "Place pending order"}</button></form>;
}
