import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EditableProduct } from "@/app/admin/products/product-editor";

export async function loadProductForm(id: string | undefined, searchParams: Promise<{ error?: string; saved?: string }>) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(id ? `/admin/products/${id}` : "/admin/products/new")}`);
  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", user.id).single();
  if (!profile?.is_active || !["owner", "admin", "inventory_manager"].includes(profile.role)) redirect("/admin");
  const admin = createAdminClient();
  const [{ data: categories }, { data: product }] = await Promise.all([
    admin.from("categories").select("id, name").order("name"),
    id ? admin.from("products").select("id, name, slug, brand, model, sku, category_id, description, base_price, stock_quantity, warranty_information, main_image, is_featured").eq("id", id).maybeSingle() : Promise.resolve({ data: null as EditableProduct | null }),
  ]);
  if (id && !product) notFound();
  return { categories: categories ?? [], product: product as EditableProduct | null, error: query.error, saved: query.saved };
}
