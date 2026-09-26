import { Check } from "lucide-react";
import { CatalogHeader } from "@/components/catalog-header";
import { ClearCartOnMount } from "@/components/clear-cart-on-mount";
import { ContinueShopping } from "@/components/continue-shopping";

export default async function CheckoutSuccess({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  return <><CatalogHeader /><ClearCartOnMount /><main className="mx-auto max-w-[700px] px-5 py-24 text-center sm:px-8"><div className="mx-auto grid size-16 place-items-center rounded-full bg-acid text-ink"><Check size={28} /></div><p className="mt-8 text-[10px] uppercase tracking-[0.25em] text-acid">Payment confirmed</p><h1 className="mt-4 font-serif text-6xl leading-none tracking-[-0.05em] text-white">Thank you.</h1><p className="mx-auto mt-6 max-w-md text-sm leading-7 text-mist">Your payment was completed and your order has been recorded. We will begin preparing it shortly.</p>{order ? <p className="mt-5 text-xs text-mist">Order reference <span className="text-white">{order}</span></p> : null}<ContinueShopping /></main></>;
}
