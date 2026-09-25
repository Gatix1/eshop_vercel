import { redirect } from "next/navigation";
import { CatalogHeader } from "@/components/catalog-header";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "@/components/checkout-form";

export default async function CheckoutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent("/checkout")}`);
  return <><CatalogHeader /><main className="mx-auto max-w-[1100px] px-5 py-16 sm:px-8"><p className="text-[10px] uppercase tracking-[0.25em] text-acid">Secure order details</p><h1 className="mt-3 font-serif text-6xl leading-none tracking-[-0.05em] text-white">Where should we send it?</h1><p className="mt-5 max-w-md text-sm leading-7 text-mist">Your prices and stock will be confirmed securely when you place the order.</p><div className="mt-12 max-w-2xl"><CheckoutForm email={user.email ?? ""} /></div></main></>;
}
