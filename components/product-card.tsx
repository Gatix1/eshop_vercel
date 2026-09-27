import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { productImage, type CatalogProduct } from "@/lib/catalog";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const image = productImage(product.main_image);
  const inStock = product.stock_quantity > 0;
  return <Link href={`/shop/${product.slug}`} className="group block"><div className="glass-panel relative aspect-[1.12] overflow-hidden rounded-[1.4rem]">{image ? <img src={image} alt={product.name} className="size-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_65%_35%,rgba(183,255,60,.2),transparent_30%),linear-gradient(135deg,#1a251d,#0c100d)]"><span className="font-serif text-5xl text-white/20">e.</span></div>}<span className={`absolute left-4 top-4 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.14em] backdrop-blur ${inStock ? "text-acid" : "text-mist"}`}>{inStock ? "În stoc" : "Indisponibil"}</span><span className="absolute bottom-4 right-4 grid size-10 place-items-center rounded-full bg-acid text-ink opacity-0 transition group-hover:opacity-100"><ArrowUpRight size={15} /></span></div><div className="flex items-start justify-between gap-4 px-1 pt-4"><div><p className="text-[10px] uppercase tracking-[0.18em] text-mist">{product.categories?.name ?? product.brand ?? "Tehnologie"}</p><h2 className="mt-2 text-base text-white">{product.name}</h2></div><p className="shrink-0 text-sm text-acid">{Number(product.base_price).toLocaleString("ro-RO")} MDL</p></div></Link>;
}
