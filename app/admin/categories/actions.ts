"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireCategoryManager() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/admin/categories");
  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", user.id).single();
  if (!profile?.is_active || !["owner", "admin", "inventory_manager"].includes(profile.role)) redirect("/account");
}

function slugify(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function readCategory(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const requestedSlug = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const slug = slugify(requestedSlug || name);
  if (!name || name.length > 120 || !slug || slug.length > 160) redirect("/admin/categories?error=Enter%20a%20valid%20category%20name%20and%20slug");
  return { name, slug, description: description || null };
}

export async function saveCategory(formData: FormData) {
  await requireCategoryManager();
  const id = String(formData.get("id") ?? "").trim();
  const category = readCategory(formData);
  const admin = createAdminClient();
  const result = id
    ? await admin.from("categories").update(category).eq("id", id).select("id").maybeSingle()
    : await admin.from("categories").insert(category).select("id").single();
  if (result.error || !result.data) redirect(`/admin/categories${id ? `/${id}` : ""}?error=${encodeURIComponent(result.error?.message ?? "Category was not saved")}`);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  redirect(`/admin/categories/${result.data.id}?saved=1`);
}

export async function toggleCategory(formData: FormData) {
  await requireCategoryManager();
  const id = String(formData.get("id") ?? "").trim();
  const isActive = formData.get("is_active") === "true";
  if (!id) redirect("/admin/categories?error=Category%20not%20found");
  const admin = createAdminClient();
  const { error } = await admin.from("categories").update({ is_active: !isActive }).eq("id", id);
  if (error) redirect(`/admin/categories?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/shop");
}
