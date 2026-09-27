import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ShippingDetails = {
  full_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  notes?: string;
};

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} MDL`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/account/orders/${id}`)}`);

  const { data: order } = await supabase.from("orders")
    .select("id, customer_id, email_snapshot, subtotal, discount_amount, shipping_amount, total, coupon_code, payment_status, fulfillment_status, shipping_details, paypal_order_id, paypal_capture_id, created_at")
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle();
  if (!order || order.customer_id !== user.id) notFound();

  const { data: items } = await supabase.from("order_items")
    .select("id, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity, line_total")
    .eq("order_id", order.id);
  const shipping = (order.shipping_details ?? {}) as ShippingDetails;

  return <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-12">
    <header className="mx-auto flex max-w-[1000px] items-center justify-between">
      <Link href="/" className="font-serif text-3xl tracking-[-0.04em] text-white">e<span className="text-acid">.</span>Shop</Link>
      <Link href="/account" className="text-xs uppercase tracking-[0.18em] text-mist hover:text-acid">Back to account</Link>
    </header>
    <section className="mx-auto max-w-[1000px] py-16">
      <Link href="/account" className="text-xs uppercase tracking-[0.18em] text-acid hover:text-white">← Order history</Link>
      <div className="mt-10 flex flex-col justify-between gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end">
        <div><p className="text-[10px] uppercase tracking-[0.25em] text-acid">Order details</p><h1 className="mt-3 font-serif text-5xl leading-none tracking-[-0.05em] text-white">Order {order.id.slice(0, 8).toUpperCase()}</h1><p className="mt-4 text-sm text-mist">Placed {formatDate(order.created_at)}</p></div>
        <div className="flex gap-3 text-[10px] uppercase tracking-[0.16em]"><span className="border border-acid/30 px-3 py-2 text-acid">Payment: {label(order.payment_status)}</span><span className="border border-white/10 px-3 py-2 text-mist">{label(order.fulfillment_status)}</span></div>
      </div>
      <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="glass p-6 sm:p-8"><p className="text-[10px] uppercase tracking-[0.2em] text-mist">Items</p><div className="mt-6 divide-y divide-white/10">{items?.map((item) => <div key={item.id} className="flex flex-col gap-3 py-5 first:pt-0 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm text-white">{item.product_name_snapshot}</p><p className="mt-1 text-xs text-mist">SKU {item.sku_snapshot} · Quantity {item.quantity}</p></div><p className="text-sm text-white">{formatMoney(Number(item.line_total))}</p></div>)}</div></div>
        <div className="space-y-5"><div className="glass p-6"><p className="text-[10px] uppercase tracking-[0.2em] text-mist">Summary</p><dl className="mt-6 space-y-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-mist">Subtotal</dt><dd className="text-white">{formatMoney(Number(order.subtotal))}</dd></div>{Number(order.discount_amount) > 0 ? <div className="flex justify-between gap-4"><dt className="text-mist">Discount{order.coupon_code ? ` · ${order.coupon_code}` : ""}</dt><dd className="text-acid">−{formatMoney(Number(order.discount_amount))}</dd></div> : null}<div className="flex justify-between gap-4"><dt className="text-mist">Shipping</dt><dd className="text-white">{Number(order.shipping_amount) ? formatMoney(Number(order.shipping_amount)) : "Free"}</dd></div><div className="flex justify-between gap-4 border-t border-white/10 pt-4"><dt className="text-white">Total</dt><dd className="text-lg text-acid">{formatMoney(Number(order.total))}</dd></div></dl></div>
          <div className="glass p-6"><p className="text-[10px] uppercase tracking-[0.2em] text-mist">Delivery details</p><dl className="mt-6 space-y-4 text-sm"><div><dt className="text-mist">Recipient</dt><dd className="mt-1 text-white">{shipping.full_name || "Not provided"}</dd></div><div><dt className="text-mist">Phone</dt><dd className="mt-1 text-white">{shipping.phone || "Not provided"}</dd></div><div><dt className="text-mist">Address</dt><dd className="mt-1 text-white">{[shipping.address, shipping.city].filter(Boolean).join(", ") || "Not provided"}</dd></div>{shipping.notes ? <div><dt className="text-mist">Notes</dt><dd className="mt-1 text-white">{shipping.notes}</dd></div> : null}</dl></div>
        </div>
      </div>
      <div className="mt-8 border-t border-white/10 pt-6 text-xs text-mist">Order email: <span className="text-white">{order.email_snapshot}</span>{order.paypal_capture_id ? <span className="ml-4">Payment reference: <span className="text-white">{order.paypal_capture_id}</span></span> : null}</div>
    </section>
  </main>;
}
