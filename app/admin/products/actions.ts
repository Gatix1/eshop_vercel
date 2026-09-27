"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireProductManager() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/admin/products");
  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", user.id).single();
  if (!profile?.is_active || !["owner", "admin", "inventory_manager"].includes(profile.role)) redirect("/account");
}

function slugify(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function readProduct(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  const basePrice = Number(formData.get("base_price"));
  const stockQuantity = Number(formData.get("stock_quantity"));
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const mainImage = String(formData.get("main_image") ?? "").trim();
  if (!name || name.length > 180 || !sku || sku.length > 80 || !Number.isFinite(basePrice) || basePrice < 0 || !Number.isInteger(stockQuantity) || stockQuantity < 0) {
    redirect("/admin/products?error=Enter%20a%20valid%20name%2C%20SKU%2C%20price%2C%20and%20stock%20quantity");
  }
  if (mainImage && !/^https?:\/\//i.test(mainImage)) redirect("/admin/products?error=Product%20image%20must%20use%20an%20HTTP%20or%20HTTPS%20URL");
  return {
    name,
    slug: slugify(String(formData.get("slug") ?? "").trim() || name),
    sku,
    base_price: basePrice,
    stock_quantity: stockQuantity,
    category_id: categoryId || null,
    brand: String(formData.get("brand") ?? "").trim() || null,
    model: String(formData.get("model") ?? "").trim() || null,
    description: description || null,
    warranty_information: String(formData.get("warranty_information") ?? "").trim() || null,
    main_image: mainImage || null,
    is_featured: formData.get("is_featured") === "on",
  };
}

export async function saveProduct(formData: FormData) {
  await requireProductManager();
  const id = String(formData.get("id") ?? "").trim();
  const product = readProduct(formData);
  if (!product.slug || product.slug.length > 180) redirect("/admin/products?error=Product%20name%20must%20produce%20a%20valid%20URL%20slug");
  const admin = createAdminClient();
  const result = id
    ? await admin.from("products").update(product).eq("id", id).select("id").maybeSingle()
    : await admin.from("products").insert(product).select("id").single();
  if (result.error || !result.data) redirect(`/admin/products${id ? `/${id}` : ""}?error=${encodeURIComponent(result.error?.message ?? "Product was not saved")}`);
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath(`/shop/${product.slug}`);
  redirect(`/admin/products/${result.data.id}?saved=1`);
}

export async function toggleProduct(formData: FormData) {
  await requireProductManager();
  const id = String(formData.get("id") ?? "").trim();
  const isActive = formData.get("is_active") === "true";
  if (!id) redirect("/admin/products?error=Product%20not%20found");
  const admin = createAdminClient();
  const { error } = await admin.from("products").update({ is_active: !isActive }).eq("id", id);
  if (error) redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/shop/[slug]", "page");
}

function readVariant(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  const price = Number(formData.get("price"));
  const stockQuantity = Number(formData.get("stock_quantity"));
  const attributesText = String(formData.get("attributes") ?? "{}").trim() || "{}";
  if (!name || name.length > 180 || !sku || sku.length > 80 || !Number.isFinite(price) || price < 0 || !Number.isInteger(stockQuantity) || stockQuantity < 0) {
    redirect(`/admin/products/${String(formData.get("product_id") ?? "")}?variant_error=Enter%20a%20valid%20variant%20name%2C%20SKU%2C%20price%2C%20and%20stock`);
  }
  let attributes: Record<string, string>;
  try {
    const parsed: unknown = JSON.parse(attributesText);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object" || Object.values(parsed).some((value) => typeof value !== "string")) throw new Error("Invalid attributes");
    attributes = parsed as Record<string, string>;
  } catch {
    redirect(`/admin/products/${String(formData.get("product_id") ?? "")}?variant_error=Attributes%20must%20be%20a%20JSON%20object%20with%20text%20values`);
  }
  return { name, sku, price, stock_quantity: stockQuantity, attributes, is_active: true };
}

export async function saveVariant(formData: FormData) {
  await requireProductManager();
  const productId = String(formData.get("product_id") ?? "").trim();
  const variantId = String(formData.get("variant_id") ?? "").trim();
  if (!productId) redirect("/admin/products?error=Product%20not%20found");
  const variant = readVariant(formData);
  const admin = createAdminClient();
  const result = variantId
    ? await admin.from("product_variants").update(variant).eq("id", variantId).eq("product_id", productId).select("id").maybeSingle()
    : await admin.from("product_variants").insert({ ...variant, product_id: productId }).select("id").single();
  if (result.error || !result.data) redirect(`/admin/products/${productId}?variant_error=${encodeURIComponent(result.error?.message ?? "Variant was not saved")}`);
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/shop");
  revalidatePath("/shop/[slug]", "page");
  redirect(`/admin/products/${productId}?variant_saved=1`);
}

export async function toggleVariant(formData: FormData) {
  await requireProductManager();
  const productId = String(formData.get("product_id") ?? "").trim();
  const variantId = String(formData.get("variant_id") ?? "").trim();
  const isActive = formData.get("is_active") === "true";
  if (!productId || !variantId) redirect("/admin/products?error=Variant%20not%20found");
  const admin = createAdminClient();
  const { error } = await admin.from("product_variants").update({ is_active: !isActive }).eq("id", variantId).eq("product_id", productId);
  if (error) redirect(`/admin/products/${productId}?variant_error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/shop");
  revalidatePath("/shop/[slug]", "page");
}
