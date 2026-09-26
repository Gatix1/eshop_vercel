import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { capturePaypalOrder, paypalAmount, paypalCurrency } from "@/lib/paypal";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order");
  const paypalOrderId = url.searchParams.get("token");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/auth?next=%2Faccount", url.origin));

  if (!orderId || !paypalOrderId) {
    return NextResponse.redirect(new URL("/account?payment=invalid", url.origin));
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, paypal_order_id, payment_status, total")
    .eq("id", orderId)
    .eq("customer_id", user.id)
    .maybeSingle();
  if (!order || order.paypal_order_id !== paypalOrderId) {
    return NextResponse.redirect(new URL("/account?payment=invalid", url.origin));
  }
  if (order.payment_status === "paid") {
    return NextResponse.redirect(new URL(`/checkout/success?order=${orderId}`, url.origin));
  }

  try {
    const capture = await capturePaypalOrder(paypalOrderId);
    const captureInfo = capture.purchase_units?.flatMap((unit) => unit.payments?.captures ?? []).find((entry) => entry.status === "COMPLETED");
    const capturedAmount = captureInfo?.amount;
    const expectedAmount = paypalAmount(Number(order.total));
    if (capture.status !== "COMPLETED" || !captureInfo?.id || capturedAmount?.currency_code !== paypalCurrency() || capturedAmount.value !== expectedAmount) {
      throw new Error("PayPal did not confirm a completed capture for the expected amount.");
    }

    const admin = createAdminClient();
    const { error } = await admin.rpc("mark_order_paid", { target_order_id: orderId, capture_id: captureInfo.id });
    if (error) throw error;
    return NextResponse.redirect(new URL(`/checkout/success?order=${orderId}`, url.origin));
  } catch (error) {
    console.error("PayPal capture failed", error);
    return NextResponse.redirect(new URL(`/account?payment=pending&order=${orderId}`, url.origin));
  }
}
