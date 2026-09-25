"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CheckoutResult = { error?: string };

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

  const { data: orderId, error } = await supabase.rpc("create_pending_order", { order_items_input: items, shipping_input: shipping });
  if (error) return { error: error.message.includes("stock") ? error.message : "We could not create the order. Please check your cart and try again." };
  redirect(`/checkout/success?order=${orderId}`);
}
