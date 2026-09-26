"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPaypalOrder, paypalAmount } from "@/lib/paypal";

export type CheckoutResult = { error?: string };

export type CouponResult = {
  valid: boolean;
  code?: string | null;
  discount?: number;
  free_shipping?: boolean;
  message?: string;
};

export async function validateCoupon(cart: string, couponCode: string): Promise<CouponResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { valid: false, message: "Please sign in before applying a coupon." };
  let items: unknown;
  try {
    items = JSON.parse(cart);
  } catch {
    return { valid: false, message: "Your cart could not be read. Please refresh and try again." };
  }
  if (!Array.isArray(items) || !items.length) return { valid: false, message: "Your cart is empty." };
  const { data, error } = await supabase.rpc("validate_coupon", { order_items_input: items, coupon_code_input: couponCode });
  if (error) return { valid: false, message: "We could not validate that coupon. Please try again." };
  return data as CouponResult;
}

export async function createPendingOrder(_state: CheckoutResult, formData: FormData): Promise<CheckoutResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent("/checkout")}`);

  const cartValue = String(formData.get("cart") ?? "[]");
  let items: unknown;
  try {
    items = JSON.parse(cartValue);
  } catch {
    return { error: "Your cart could not be read. Please refresh and try again." };
  }
  if (!Array.isArray(items) || !items.length) return { error: "Your cart is empty." };

  const shipping = {
    full_name: String(formData.get("full_name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };
  if (!shipping.full_name || !shipping.phone || !shipping.address || !shipping.city) return { error: "Name, phone, address, and city are required." };

  const couponCode = String(formData.get("coupon_code") ?? "").trim();
  const { data: orderId, error } = await supabase.rpc("create_pending_order", { order_items_input: items, shipping_input: shipping, coupon_code_input: couponCode || null });
  if (error) {
    console.error("Pending order creation failed", { code: error.code, message: error.message, details: error.details, hint: error.hint });
    if (/stock|available|cart|quantity|profile|coupon|order of|first orders|usage limit|does not apply/i.test(error.message)) {
      if (/active customer profile/i.test(error.message)) return { error: "Your customer profile is not ready yet. Please sign out, sign in again, and retry checkout. If it still fails, ask the store administrator to run the profile repair migration." };
      if (/profile is inactive/i.test(error.message)) return { error: "This customer account is inactive. Please contact the store for help." };
      return { error: error.message };
    }
    if (error.code === "42883" || error.code === "PGRST202") return { error: "Checkout database setup is incomplete. Ask the store administrator to apply the latest orders migration." };
    return { error: "We could not create the order. Please try again or contact support if the problem continues." };
  }
  const { data: order } = await supabase.from("orders").select("total").eq("id", orderId).single();
  if (!order) return { error: "Order was created but its total could not be loaded. Contact support before retrying." };

  let paypalOrder: Awaited<ReturnType<typeof createPaypalOrder>>;
  try {
    paypalAmount(Number(order.total));
    const requestOrigin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    paypalOrder = await createPaypalOrder({ orderId, totalMdl: Number(order.total), origin: requestOrigin });
  } catch (paypalError) {
    console.error("PayPal order creation failed", paypalError);
    return { error: paypalError instanceof Error ? paypalError.message : "PayPal could not start this payment." };
  }

  const approvalUrl = paypalOrder.links?.find((link) => link.rel === "approve")?.href;
  if (!approvalUrl) return { error: "PayPal did not provide an approval link. Please try again." };
  const admin = createAdminClient();
  const { error: saveError } = await admin.rpc("set_paypal_order", { target_order_id: orderId, provider_order_id: paypalOrder.id });
  if (saveError) {
    console.error("Could not save PayPal order ID", saveError);
    return { error: "PayPal payment was started but the order could not be linked. Contact support before retrying." };
  }
  redirect(approvalUrl);
}
