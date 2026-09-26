"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireCouponManager() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/admin/coupons");
  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", user.id).single();
  if (!profile?.is_active || !["owner", "admin"].includes(profile.role)) redirect("/account");
}

export async function createCoupon(formData: FormData) {
  await requireCouponManager();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const discountType = String(formData.get("discount_type") ?? "percentage");
  const discountValue = Number(formData.get("discount_value"));
  const minimumOrderAmount = Number(formData.get("minimum_order_amount") || 0);
  const maxDiscountAmount = String(formData.get("max_discount_amount") ?? "").trim();
  const usageLimit = String(formData.get("usage_limit") ?? "").trim();
  const perCustomerLimit = String(formData.get("per_customer_limit") ?? "").trim();
  const targetProductId = String(formData.get("product_id") ?? "").trim();
  const targetCategoryId = String(formData.get("category_id") ?? "").trim();
  if (!code || !["percentage", "fixed"].includes(discountType) || !Number.isFinite(discountValue) || discountValue <= 0) redirect("/admin/coupons?error=Enter%20a%20valid%20coupon");
  if (targetProductId && targetCategoryId) redirect("/admin/coupons?error=Choose%20one%20target%20type");
  const admin = createAdminClient();
  const { data: coupon, error } = await admin.from("coupons").insert({
    code,
    discount_type: discountType,
    discount_value: discountValue,
    minimum_order_amount: minimumOrderAmount,
    max_discount_amount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
    usage_limit: usageLimit ? Number(usageLimit) : null,
    per_customer_limit: perCustomerLimit ? Number(perCustomerLimit) : null,
    first_order_only: formData.get("first_order_only") === "on",
    free_shipping: formData.get("free_shipping") === "on",
    starts_at: String(formData.get("starts_at") ?? "") || null,
    expires_at: String(formData.get("expires_at") ?? "") || null,
  }).select("id").single();
  if (error || !coupon) redirect(`/admin/coupons?error=${encodeURIComponent(error?.message ?? "Could not create coupon")}`);
  if (targetProductId) await admin.from("coupon_products").insert({ coupon_id: coupon.id, product_id: targetProductId });
  if (targetCategoryId) await admin.from("coupon_categories").insert({ coupon_id: coupon.id, category_id: targetCategoryId });
  revalidatePath("/admin/coupons");
  redirect("/admin/coupons?created=1");
}

export async function toggleCoupon(formData: FormData) {
  await requireCouponManager();
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("is_active") === "true";
  const admin = createAdminClient();
  await admin.from("coupons").update({ is_active: !isActive }).eq("id", id);
  revalidatePath("/admin/coupons");
}
