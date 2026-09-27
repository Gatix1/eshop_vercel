"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const fulfillmentStatuses = ["unfulfilled", "processing", "packed", "shipped", "delivered", "cancelled"] as const;

async function requireOrderManager() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/admin/orders");
  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", user.id).single();
  if (!profile?.is_active || !["owner", "admin", "order_manager"].includes(profile.role)) redirect("/account");
}

export async function updateFulfillmentStatus(formData: FormData) {
  await requireOrderManager();
  const orderId = String(formData.get("order_id") ?? "");
  const status = String(formData.get("fulfillment_status") ?? "");
  if (!orderId || !fulfillmentStatuses.includes(status as (typeof fulfillmentStatuses)[number])) {
    redirect(`/admin/orders/${orderId}?error=Choose%20a%20valid%20fulfillment%20status`);
  }

  const admin = createAdminClient();
  const { error } = await admin.from("orders").update({ fulfillment_status: status }).eq("id", orderId);
  if (error) redirect(`/admin/orders/${orderId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/account/orders/${orderId}`);
  redirect(`/admin/orders/${orderId}?updated=1`);
}
