import { redirect } from "next/navigation";
import { CatalogHeader } from "@/components/catalog-header";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "@/components/checkout-form";

export default async function CheckoutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent("/checkout")}`);
  const eurToMdlRate = Number(process.env.PAYPAL_EUR_TO_MDL_RATE);
  return <><CatalogHeader /><main className="mx-auto max-w-[1100px] px-5 py-16 sm:px-8"><p className="text-[10px] uppercase tracking-[0.22em] text-acid">Detalii comandă</p><h1 className="mt-3 font-serif text-6xl leading-none text-white">Unde o livrăm?</h1><p className="mt-5 max-w-2xl text-sm leading-7 text-mist">Prețurile sunt afișate în MDL. PayPal va procesa plata în EUR folosind rata configurată{Number.isFinite(eurToMdlRate) && eurToMdlRate > 0 ? ` (1 EUR = ${eurToMdlRate} MDL)` : ""}. Totalul final este recalculat înainte de confirmarea plății.</p>{!Number.isFinite(eurToMdlRate) || eurToMdlRate <= 0 ? <p className="mt-5 rounded-2xl border border-red-400/30 px-4 py-3 text-sm text-red-300">Plățile în EUR nu sunt configurate încă. Contactează magazinul înainte de a plasa comanda.</p> : null}<div className="mt-12 max-w-2xl"><CheckoutForm email={user.email ?? ""} /></div></main></>;
}
