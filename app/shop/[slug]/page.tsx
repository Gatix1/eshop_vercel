import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CatalogHeader } from "@/components/catalog-header";
import { ProductOptions } from "@/components/product-options";
import { getProduct, productImage } from "@/lib/catalog";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const variants = product.product_variants ?? [];
  const images = (product.product_images ?? []).sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order);
  const category = Array.isArray(product.categories) ? product.categories[0] : product.categories;
  const image = productImage(images[0]?.storage_path ?? product.main_image);
  return <><CatalogHeader /><main className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 lg:px-12"><Link href="/shop" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-mist transition hover:text-acid"><ArrowLeft size={14} /> Back to collection</Link><div className="mt-12 grid gap-12 lg:grid-cols-2"><div className="aspect-square overflow-hidden border border-white/10 bg-[#111713]">{image ? <img src={image} alt={product.name} className="size-full object-cover" /> : <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_65%_35%,rgba(183,255,60,.2),transparent_30%),linear-gradient(135deg,#1a251d,#0c100d)]"><span className="font-serif text-8xl text-white/20">e.</span></div>}</div><div className="max-w-xl py-2"><p className="text-[10px] uppercase tracking-[0.25em] text-acid">{category?.name ?? product.brand ?? "Hardware"}</p><h1 className="mt-4 font-serif text-6xl leading-[0.9] tracking-[-0.05em] text-white">{product.name}</h1>{product.model ? <p className="mt-4 text-sm text-mist">{product.brand} / {product.model}</p> : null}<p className="mt-8 text-sm leading-7 text-mist">{product.description ?? "A considered piece of hardware for your everyday setup."}</p><ProductOptions productId={product.id} name={product.name} sku={product.sku} image={image} variants={variants} basePrice={Number(product.base_price)} baseStock={product.stock_quantity} /><div className="mt-8 grid gap-4 sm:grid-cols-2"><div><p className="text-[10px] uppercase tracking-[0.18em] text-mist">SKU</p><p className="mt-2 text-sm text-white">{product.sku}</p></div><div><p className="text-[10px] uppercase tracking-[0.18em] text-mist">Warranty</p><p className="mt-2 text-sm text-white">{product.warranty_information ?? "To be confirmed"}</p></div></div></div></div></main></>;
}
