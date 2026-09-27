import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} MDL`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ payment?: string; order?: string }> }) {
  const { payment, order: highlightedOrder } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/account");

  const { data: profile } = await supabase.from("profiles").select("full_name, email, phone, role").eq("id", user.id).single();
  const { data: orders } = await supabase.from("orders").select("id, total, payment_status, fulfillment_status, created_at, paypal_order_id").eq("customer_id", user.id).neq("payment_status", "pending").order("created_at", { ascending: false });
  const paymentMessage = payment === "complete" ? "Payment confirmed. Your order is being prepared." : payment === "pending" ? "Payment is still pending. Check the order status before trying again." : payment === "cancelled" ? "Payment was cancelled. Your order remains pending." : payment === "invalid" ? "We could not verify that payment return." : null;

  return <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-12">
    <header className="mx-auto flex max-w-[1200px] items-center justify-between">
      <Link href="/" className="font-serif text-3xl tracking-[-0.04em] text-white">e<span className="text-acid">.</span>Shop</Link>
      <form action={signOut}><button className="text-xs uppercase tracking-[0.18em] text-mist transition hover:text-acid">Sign out</button></form>
    </header>
    <section className="mx-auto max-w-[1200px] py-24">
      <p className="text-[10px] uppercase tracking-[0.25em] text-acid">Your account</p>
      <h1 className="mt-4 font-serif text-6xl tracking-[-0.05em] text-white">Hello, {profile?.full_name ?? "there"}.</h1>
      {paymentMessage ? <p className="mt-6 border border-acid/30 bg-acid/5 px-4 py-3 text-sm text-acid">{paymentMessage}</p> : null}
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <div className="glass p-7">
          <p className="text-[10px] uppercase tracking-[0.2em] text-mist">Account details</p>
          <dl className="mt-6 space-y-4 text-sm">
            <div className="flex justify-between gap-4 border-b border-white/10 pb-3"><dt className="text-mist">Email</dt><dd className="text-right text-white">{profile?.email ?? user.email}</dd></div>
            <div className="flex justify-between gap-4 border-b border-white/10 pb-3"><dt className="text-mist">Phone</dt><dd className="text-right text-white">{profile?.phone ?? "Not added"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-mist">Account type</dt><dd className="capitalize text-acid">{profile?.role ?? "customer"}</dd></div>
          </dl>
        </div>
        <div className="glass p-7">
          <p className="text-[10px] uppercase tracking-[0.2em] text-mist">Orders</p>
          <h2 className="mt-6 font-serif text-4xl text-white">Your order history</h2>
          {orders?.length ? <div className="mt-7 divide-y divide-white/10">{orders.map((customerOrder) => <Link href={`/account/orders/${customerOrder.id}`} key={customerOrder.id} className={`block py-4 first:pt-0 transition hover:text-acid ${highlightedOrder === customerOrder.id ? "rounded border border-acid/30 px-3" : ""}`}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs text-white">Order {customerOrder.id.slice(0, 8).toUpperCase()}</p><p className="mt-1 text-xs text-mist">{formatDate(customerOrder.created_at)}</p></div><p className="text-sm text-white">{formatMoney(Number(customerOrder.total))}</p></div>
            <div className="mt-3 flex gap-3 text-[10px] uppercase tracking-[0.16em]"><span className="text-acid">Payment: {customerOrder.payment_status}</span><span className="text-mist">Fulfillment: {customerOrder.fulfillment_status}</span></div>
          </Link>)}</div> : <p className="mt-6 text-sm leading-7 text-mist">Your orders will appear here after checkout.</p>}
        </div>
      </div>
      {profile?.role && ["owner", "admin"].includes(profile.role) ? <Link href="/admin" className="mt-8 inline-flex text-xs uppercase tracking-[0.18em] text-acid hover:text-white">Open admin workspace</Link> : null}
    </section>
  </main>;
}
