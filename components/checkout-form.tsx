"use client";

import { useActionState, useEffect, useState } from "react";
import { createPendingOrder, validateCoupon, type CheckoutResult, type CouponResult } from "@/app/checkout/actions";
import { useCart } from "@/components/cart-provider";
import { cartSubtotal } from "@/lib/cart";

const initialState: CheckoutResult = {};

export function CheckoutForm({ email }: { email: string }) {
  const { items } = useCart();
  const [state, action, pending] = useActionState(createPendingOrder, initialState);
  const [cart, setCart] = useState("[]");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  useEffect(() => {
    setCart(JSON.stringify(items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity }))));
    setCoupon(null);
  }, [items]);
  const subtotal = cartSubtotal(items);
  const discount = coupon?.valid ? Number(coupon.discount ?? 0) : 0;
  const total = Math.max(subtotal - discount, 0);
  async function applyCoupon() {
    setCheckingCoupon(true);
    setCoupon(await validateCoupon(cart, couponCode));
    setCheckingCoupon(false);
  }
  return <form action={action} className="space-y-8"><input type="hidden" name="cart" value={cart} /><input type="hidden" name="coupon_code" value={coupon?.valid ? coupon.code ?? "" : ""} /><div className="grid gap-5 sm:grid-cols-2"><label className="text-xs text-mist">Email<input value={email} readOnly className="mt-2 w-full border-b border-white/20 bg-transparent py-3 text-sm text-white outline-none" /></label><label className="text-xs text-mist">Full name<input name="full_name" required className="mt-2 w-full border-b border-white/20 bg-transparent py-3 text-sm text-white outline-none focus:border-acid" /></label><label className="text-xs text-mist">Phone<input name="phone" required type="tel" className="mt-2 w-full border-b border-white/20 bg-transparent py-3 text-sm text-white outline-none focus:border-acid" /></label><label className="text-xs text-mist">City<input name="city" required defaultValue="Chișinău" className="mt-2 w-full border-b border-white/20 bg-transparent py-3 text-sm text-white outline-none focus:border-acid" /></label></div><label className="block text-xs text-mist">Delivery address<textarea name="address" required rows={3} className="mt-2 w-full resize-none border border-white/10 bg-white/[.02] p-3 text-sm text-white outline-none focus:border-acid" /></label><label className="block text-xs text-mist">Notes <span className="text-white/40">(optional)</span><textarea name="notes" rows={3} className="mt-2 w-full resize-none border border-white/10 bg-white/[.02] p-3 text-sm text-white outline-none focus:border-acid" /></label><div className="border-y border-white/10 py-6"><p className="text-[10px] uppercase tracking-[0.2em] text-mist">Coupon code</p><div className="mt-3 flex gap-3"><input value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setCoupon(null); }} placeholder="ENTER CODE" className="min-w-0 flex-1 border-b border-white/20 bg-transparent py-3 text-sm text-white outline-none placeholder:text-mist focus:border-acid" /><button type="button" onClick={applyCoupon} disabled={checkingCoupon || !couponCode.trim() || !items.length} className="text-xs uppercase tracking-[0.18em] text-acid disabled:text-mist">{checkingCoupon ? "Checking..." : "Apply"}</button></div>{coupon?.message ? <p className={`mt-3 text-sm ${coupon.valid ? "text-acid" : "text-red-300"}`}>{coupon.message}</p> : null}<div className="mt-6 space-y-3 text-sm"><div className="flex justify-between text-mist"><span>Subtotal</span><span>{subtotal.toLocaleString("en-US")} MDL</span></div>{coupon?.valid ? <div className="flex justify-between text-acid"><span>Discount ({coupon.code})</span><span>-{discount.toLocaleString("en-US")} MDL</span></div> : null}<div className="flex justify-between border-t border-white/10 pt-3 text-white"><span>Total</span><span>{total.toLocaleString("en-US")} MDL</span></div></div></div>{state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}<button disabled={pending || !items.length} className="min-h-12 bg-acid px-6 text-xs uppercase tracking-[0.18em] text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-mist">{pending ? "Creating order..." : "Place pending order"}</button></form>;
}
