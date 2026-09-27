"use client";

import { useState } from "react";
import { AddToCart } from "@/components/add-to-cart";

type Variant = { id: string; name: string; price: number; stock_quantity: number; sku: string };

export function ProductOptions({ productId, name, sku, image, variants, basePrice, baseStock }: { productId: string; name: string; sku: string; image?: string | null; variants: Variant[]; basePrice: number; baseStock: number }) {
  const [selected, setSelected] = useState<Variant | null>(null);
  const currentPrice = selected?.price ?? basePrice;
  const currentStock = selected?.stock_quantity ?? baseStock;
  return <div className="glass-panel mt-8 rounded-[1.5rem] p-5"><div className="flex items-baseline justify-between gap-4"><p className="text-2xl text-acid">{Number(currentPrice).toLocaleString("ro-RO")} MDL</p><p className={`text-xs uppercase tracking-[0.16em] ${currentStock > 0 ? "text-acid" : "text-mist"}`}>{currentStock > 0 ? `${currentStock} disponibile` : "Indisponibil"}</p></div>{variants.length ? <div className="mt-6"><p className="text-[10px] uppercase tracking-[0.16em] text-mist">Alege configurația</p><div className="mt-3 flex flex-wrap gap-2">{variants.map((variant) => <button type="button" key={variant.id} onClick={() => setSelected(variant)} className={`rounded-full border px-4 py-2 text-xs transition ${selected?.id === variant.id ? "border-acid text-acid" : variant.stock_quantity > 0 ? "border-white/20 text-white hover:border-acid" : "border-white/10 text-mist line-through"}`} disabled={variant.stock_quantity < 1}>{variant.name}</button>)}</div></div> : null}<div className="mt-6"><AddToCart productId={productId} variantId={selected?.id} name={name} variantName={selected?.name} sku={selected?.sku ?? sku} price={currentPrice} image={image} disabled={currentStock < 1} /></div></div>;
}
