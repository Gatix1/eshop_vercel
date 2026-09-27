import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} MDL`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/admin/orders");
  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", user.id).single();
  if (!profile?.is_active || !["owner", "admin", "order_manager"].includes(profile.role)) redirect("/admin");

  const admin = createAdminClient();
  const { data: orders } = await admin.from("orders")
    .select("id, email_snapshot, total, payment_status, fulfillment_status, created_at")
    .neq("payment_status", "pending")
    .order("created_at", { ascending: false });

  return <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-12">
    <header className="mx-auto flex max-w-[1200px] items-center justify-between"><Link href="/admin" className="font-serif text-3xl tracking-[-0.04em] text-white">e<span className="text-acid">.</span>Shop</Link><Link href="/account" className="text-xs uppercase tracking-[0.18em] text-mist hover:text-acid">Account</Link></header>
    <section className="mx-auto max-w-[1200px] py-16"><Link href="/admin" className="text-xs uppercase tracking-[0.18em] text-acid hover:text-white">← Admin workspace</Link><p className="mt-10 text-[10px] uppercase tracking-[0.25em] text-acid">Admin · Operations</p><h1 className="mt-3 font-serif text-6xl leading-none tracking-[-0.05em] text-white">Orders.</h1><p className="mt-5 max-w-xl text-sm leading-7 text-mist">Review paid orders and keep fulfillment status current for customers.</p>
      {orders?.length ? <div className="mt-12 divide-y divide-white/10 border-y border-white/10">{orders.map((order) => <Link href={`/admin/orders/${order.id}`} key={order.id} className="block py-6 transition hover:bg-white/[0.03]"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-sm text-white">Order {order.id.slice(0, 8).toUpperCase()}</p><p className="mt-1 text-xs text-mist">{order.email_snapshot} · {formatDate(order.created_at)}</p></div><p className="text-sm text-acid">{formatMoney(Number(order.total))}</p></div><div className="mt-4 flex flex-wrap gap-4 text-[10px] uppercase tracking-[0.16em]"><span className="text-acid">Payment: {label(order.payment_status)}</span><span className="text-mist">Fulfillment: {label(order.fulfillment_status)}</span></div></Link>)}</div> : <p className="glass mt-12 p-7 text-sm text-mist">No orders have been placed yet.</p>}
    </section>
  </main>;
}
