import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { productImage, type CatalogProduct } from "@/lib/catalog";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const image = productImage(product.main_image);
  const inStock = product.stock_quantity > 0;
  return <Link href={`/shop/${product.slug}`} className="group block"><div className="relative aspect-[1.12] overflow-hidden border border-white/10 bg-[#111713]">{image ? <img src={image} alt={product.name} className="size-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_65%_35%,rgba(183,255,60,.2),transparent_30%),linear-gradient(135deg,#1a251d,#0c100d)]"><span className="font-serif text-5xl text-white/20">e.</span></div>}<span className={`absolute left-4 top-4 text-[10px] uppercase tracking-[0.18em] ${inStock ? "text-acid" : "text-mist"}`}>{inStock ? "In stock" : "Unavailable"}</span><span className="absolute bottom-4 right-4 grid size-9 place-items-center rounded-full bg-acid text-ink opacity-0 transition group-hover:opacity-100"><ArrowUpRight size={15} /></span></div><div className="flex items-start justify-between gap-4 pt-4"><div><p className="text-[10px] uppercase tracking-[0.2em] text-mist">{product.categories?.name ?? product.brand ?? "Hardware"}</p><h2 className="mt-2 text-base text-white">{product.name}</h2></div><p className="shrink-0 text-sm text-acid">{Number(product.base_price).toLocaleString("en-US")} MDL</p></div></Link>;
}
