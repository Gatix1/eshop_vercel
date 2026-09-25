import { createClient } from "@/lib/supabase/server";

export const PRODUCTS_PER_PAGE = 12;

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  model: string | null;
  description: string | null;
  base_price: number;
  sku: string;
  stock_quantity: number;
  main_image: string | null;
  is_featured: boolean;
  categories: { name: string; slug: string } | null;
};

export type ProductVariant = {
  id: string;
  name: string;
  attributes: Record<string, string>;
  sku: string;
  price: number;
  stock_quantity: number;
};

export async function getCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, description")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function getProducts({ query, category, featured, page = 1 }: { query?: string; category?: string; featured?: boolean; page?: number }) {
  const supabase = await createClient();
  const from = (page - 1) * PRODUCTS_PER_PAGE;
  const to = from + PRODUCTS_PER_PAGE - 1;
  let request = supabase
    .from("products")
    .select("id, name, slug, brand, model, description, base_price, sku, stock_quantity, main_image, is_featured, categories!inner(name, slug)", { count: "exact" })
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (query) request = request.or(`name.ilike.%${query}%,brand.ilike.%${query}%,model.ilike.%${query}%,sku.ilike.%${query}%`);
  if (category) request = request.eq("categories.slug", category);
  if (featured) request = request.eq("is_featured", true);

  const { data, count } = await request;
  return { products: (data ?? []) as unknown as CatalogProduct[], count: count ?? 0 };
}

export async function getProduct(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, slug, brand, model, description, specifications, base_price, sku, stock_quantity, warranty_information, main_image, categories(name, slug), product_variants(id, name, attributes, sku, price, stock_quantity), product_images(id, storage_path, alt_text, sort_order)")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

export function productImage(path: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
  return base ? `${base}/storage/v1/object/public/product-images/${path.replace(/^\/+/, "")}` : null;
}
