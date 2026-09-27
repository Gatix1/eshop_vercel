import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateFulfillmentStatus } from "@/app/admin/orders/actions";

const fulfillmentStatuses = ["unfulfilled", "processing", "packed", "shipped", "delivered", "cancelled"];

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} MDL`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

export default async function AdminOrderDetailsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; updated?: string }> }) {
  const { id } = await params;
  const { error, updated } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/admin/orders/${id}`)}`);
  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", user.id).single();
  if (!profile?.is_active || !["owner", "admin", "order_manager"].includes(profile.role)) redirect("/admin");

  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("id, email_snapshot, subtotal, discount_amount, shipping_amount, total, coupon_code, payment_status, fulfillment_status, shipping_details, paypal_order_id, paypal_capture_id, created_at").eq("id", id).maybeSingle();
  if (!order) redirect("/admin/orders");
  const { data: items } = await admin.from("order_items").select("id, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity, line_total").eq("order_id", id);
  const shipping = (order.shipping_details ?? {}) as { full_name?: string; phone?: string; address?: string; city?: string; notes?: string };

  return <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-12"><header className="mx-auto flex max-w-[1100px] items-center justify-between"><Link href="/admin" className="font-serif text-3xl tracking-[-0.04em] text-white">e<span className="text-acid">.</span>Shop</Link><Link href="/account" className="text-xs uppercase tracking-[0.18em] text-mist hover:text-acid">Account</Link></header><section className="mx-auto max-w-[1100px] py-16"><Link href="/admin/orders" className="text-xs uppercase tracking-[0.18em] text-acid hover:text-white">← All orders</Link><div className="mt-10 flex flex-col justify-between gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end"><div><p className="text-[10px] uppercase tracking-[0.25em] text-acid">Order management</p><h1 className="mt-3 font-serif text-5xl leading-none tracking-[-0.05em] text-white">Order {order.id.slice(0, 8).toUpperCase()}</h1><p className="mt-4 text-sm text-mist">{order.email_snapshot} · {formatDate(order.created_at)}</p></div><div className="text-right text-[10px] uppercase tracking-[0.16em]"><p className="text-acid">Payment: {label(order.payment_status)}</p><p className="mt-2 text-mist">Fulfillment: {label(order.fulfillment_status)}</p></div></div>{error ? <p className="mt-6 border border-red-400/30 px-4 py-3 text-sm text-red-300">{error}</p> : null}{updated ? <p className="mt-6 border border-acid/30 px-4 py-3 text-sm text-acid">Fulfillment status updated.</p> : null}<div className="mt-10 grid gap-5 lg:grid-cols-[1fr_320px]"><div className="glass p-6 sm:p-8"><p className="text-[10px] uppercase tracking-[0.2em] text-mist">Items</p><div className="mt-6 divide-y divide-white/10">{items?.map((item) => <div key={item.id} className="flex flex-col gap-3 py-5 first:pt-0 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm text-white">{item.product_name_snapshot}</p><p className="mt-1 text-xs text-mist">SKU {item.sku_snapshot} · {item.quantity} × {formatMoney(Number(item.unit_price_snapshot))}</p></div><p className="text-sm text-white">{formatMoney(Number(item.line_total))}</p></div>)}</div></div><div className="space-y-5"><form action={updateFulfillmentStatus} className="glass space-y-5 p-6"><p className="text-[10px] uppercase tracking-[0.2em] text-mist">Fulfillment status</p><input type="hidden" name="order_id" value={order.id} /><select name="fulfillment_status" defaultValue={order.fulfillment_status} className="w-full border border-white/10 bg-[#111713] p-3 text-sm capitalize text-white">{fulfillmentStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select><button className="w-full bg-acid px-4 py-3 text-xs uppercase tracking-[0.18em] text-ink transition hover:bg-white">Save status</button></form><div className="glass p-6"><p className="text-[10px] uppercase tracking-[0.2em] text-mist">Delivery details</p><dl className="mt-6 space-y-4 text-sm"><div><dt className="text-mist">Recipient</dt><dd className="mt-1 text-white">{shipping.full_name || "Not provided"}</dd></div><div><dt className="text-mist">Phone</dt><dd className="mt-1 text-white">{shipping.phone || "Not provided"}</dd></div><div><dt className="text-mist">Address</dt><dd className="mt-1 text-white">{[shipping.address, shipping.city].filter(Boolean).join(", ") || "Not provided"}</dd></div>{shipping.notes ? <div><dt className="text-mist">Notes</dt><dd className="mt-1 text-white">{shipping.notes}</dd></div> : null}</dl></div></div></div><div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-xs text-mist"><span>Subtotal: <strong className="font-normal text-white">{formatMoney(Number(order.subtotal))}</strong></span>{Number(order.discount_amount) > 0 ? <span>Discount: <strong className="font-normal text-acid">−{formatMoney(Number(order.discount_amount))}</strong></span> : null}<span>Shipping: <strong className="font-normal text-white">{Number(order.shipping_amount) ? formatMoney(Number(order.shipping_amount)) : "Free"}</strong></span><span>Total: <strong className="font-normal text-acid">{formatMoney(Number(order.total))}</strong></span></div></section></main>;
}
