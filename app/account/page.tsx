import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/account");

  const { data: profile } = await supabase.from("profiles").select("full_name, email, phone, role").eq("id", user.id).single();

  return <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-12"><header className="mx-auto flex max-w-[1200px] items-center justify-between"><Link href="/" className="font-serif text-3xl tracking-[-0.04em] text-white">e<span className="text-acid">.</span>Shop</Link><form action={signOut}><button className="text-xs uppercase tracking-[0.18em] text-mist transition hover:text-acid">Sign out</button></form></header><section className="mx-auto max-w-[1200px] py-24"><p className="text-[10px] uppercase tracking-[0.25em] text-acid">Your account</p><h1 className="mt-4 font-serif text-6xl tracking-[-0.05em] text-white">Hello, {profile?.full_name ?? "there"}.</h1><div className="mt-12 grid gap-5 md:grid-cols-2"><div className="glass p-7"><p className="text-[10px] uppercase tracking-[0.2em] text-mist">Account details</p><dl className="mt-6 space-y-4 text-sm"><div className="flex justify-between gap-4 border-b border-white/10 pb-3"><dt className="text-mist">Email</dt><dd className="text-white">{profile?.email ?? user.email}</dd></div><div className="flex justify-between gap-4 border-b border-white/10 pb-3"><dt className="text-mist">Phone</dt><dd className="text-white">{profile?.phone ?? "Not added"}</dd></div><div className="flex justify-between gap-4"><dt className="text-mist">Account type</dt><dd className="capitalize text-acid">{profile?.role ?? "customer"}</dd></div></dl></div><div className="glass p-7"><p className="text-[10px] uppercase tracking-[0.2em] text-mist">Orders</p><h2 className="mt-6 font-serif text-4xl text-white">Your order history</h2><p className="mt-3 text-sm leading-6 text-mist">Orders will appear here once the catalog and checkout are connected.</p></div></div></section></main>;
}
