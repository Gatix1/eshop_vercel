import { redirect } from "next/navigation";
import { CatalogHeader } from "@/components/catalog-header";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "@/components/checkout-form";

export default async function CheckoutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent("/checkout")}`);
  const eurToMdlRate = Number(process.env.PAYPAL_EUR_TO_MDL_RATE);
  return <><CatalogHeader /><main className="mx-auto max-w-[1100px] px-5 py-16 sm:px-8"><p className="text-[10px] uppercase tracking-[0.25em] text-acid">Secure order details</p><h1 className="mt-3 font-serif text-6xl leading-none tracking-[-0.05em] text-white">Where should we send it?</h1><p className="mt-5 max-w-2xl text-sm leading-7 text-mist">Your catalog prices are in MDL. PayPal will charge in EUR using the store’s configured conversion rate{Number.isFinite(eurToMdlRate) && eurToMdlRate > 0 ? ` (1 EUR = ${eurToMdlRate} MDL)` : ""}. The final amount is recalculated from current product prices and shown by PayPal before you approve payment.</p>{!Number.isFinite(eurToMdlRate) || eurToMdlRate <= 0 ? <p className="mt-5 border border-red-400/30 px-4 py-3 text-sm text-red-300">EUR payments are not configured yet. Please contact the store before placing an order.</p> : null}<div className="mt-12 max-w-2xl"><CheckoutForm email={user.email ?? ""} /></div></main></>;
}
