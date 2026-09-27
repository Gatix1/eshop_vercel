import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toggleProduct } from "@/app/admin/products/actions";

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} MDL`;
}

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/admin/products");
  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", user.id).single();
  if (!profile?.is_active || !["owner", "admin", "inventory_manager"].includes(profile.role)) redirect("/admin");
  const admin = createAdminClient();
  const [{ data: products }, { data: categories }] = await Promise.all([
    admin.from("products").select("id, name, sku, category_id, base_price, stock_quantity, is_active, is_featured").order("created_at", { ascending: false }),
    admin.from("categories").select("id, name"),
  ]);
  const categoryNames = new Map((categories ?? []).map((category) => [category.id, category.name]));

  return <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-12"><header className="mx-auto flex max-w-[1200px] items-center justify-between"><Link href="/admin" className="font-serif text-3xl tracking-[-0.04em] text-white">e<span className="text-acid">.</span>Shop</Link><Link href="/account" className="text-xs uppercase tracking-[0.18em] text-mist hover:text-acid">Account</Link></header><section className="mx-auto max-w-[1200px] py-16"><Link href="/admin" className="text-xs uppercase tracking-[0.18em] text-acid hover:text-white">← Admin workspace</Link><div className="mt-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-[10px] uppercase tracking-[0.25em] text-acid">Admin · Catalog</p><h1 className="mt-3 font-serif text-6xl leading-none tracking-[-0.05em] text-white">Products.</h1></div><Link href="/admin/products/new" className="inline-flex w-fit bg-acid px-5 py-3 text-xs uppercase tracking-[0.16em] text-ink transition hover:bg-white">Add product</Link></div>{params.error ? <p className="mt-6 border border-red-400/30 px-4 py-3 text-sm text-red-300">{params.error}</p> : null}{params.created ? <p className="mt-6 border border-acid/30 px-4 py-3 text-sm text-acid">Product created.</p> : null}{products?.length ? <div className="mt-10 overflow-x-auto border-y border-white/10"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-[10px] uppercase tracking-[0.16em] text-mist"><tr><th className="py-4 pr-4 font-normal">Product</th><th className="py-4 pr-4 font-normal">SKU</th><th className="py-4 pr-4 font-normal">Category</th><th className="py-4 pr-4 font-normal">Price</th><th className="py-4 pr-4 font-normal">Stock</th><th className="py-4 pr-4 font-normal">Status</th><th className="py-4 font-normal">Actions</th></tr></thead><tbody className="divide-y divide-white/10">{products.map((product) => <tr key={product.id}><td className="py-4 pr-4"><Link href={`/admin/products/${product.id}`} className="text-white hover:text-acid">{product.name}</Link>{product.is_featured ? <span className="ml-2 text-[9px] uppercase tracking-[0.12em] text-acid">Featured</span> : null}</td><td className="py-4 pr-4 text-xs text-mist">{product.sku}</td><td className="py-4 pr-4 text-xs text-mist">{product.category_id ? categoryNames.get(product.category_id) ?? "Uncategorized" : "Uncategorized"}</td><td className="py-4 pr-4 text-white">{formatMoney(Number(product.base_price))}</td><td className={`py-4 pr-4 ${product.stock_quantity < 5 ? "text-amber-300" : "text-mist"}`}>{product.stock_quantity}</td><td className="py-4 pr-4"><span className={product.is_active ? "text-acid" : "text-mist"}>{product.is_active ? "Active" : "Inactive"}</span></td><td className="py-4"><div className="flex items-center gap-4"><Link href={`/admin/products/${product.id}`} className="text-xs text-white underline decoration-white/20 underline-offset-4 hover:text-acid">Edit</Link><form action={toggleProduct}><input type="hidden" name="id" value={product.id} /><input type="hidden" name="is_active" value={String(product.is_active)} /><button className="text-xs text-mist underline decoration-white/20 underline-offset-4 hover:text-acid">{product.is_active ? "Deactivate" : "Activate"}</button></form></div></td></tr>)}</tbody></table></div> : <p className="glass mt-10 p-7 text-sm text-mist">No products yet. Add the first product to start building the catalog.</p>}</section></main>;
}
