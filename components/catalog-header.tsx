"use client";

import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { CartLink } from "@/components/cart-link";
import { useState } from "react";

export function CatalogHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <header className="px-5 pt-4 sm:px-8 lg:px-12"><div className="mx-auto max-w-[1400px]"><div className="glass-panel flex items-center justify-between rounded-full px-4 py-3 sm:px-6"><Link href="/" className="font-serif text-3xl text-white">e<span className="text-acid">.</span>Shop</Link><nav className="hidden items-center gap-7 text-xs uppercase tracking-[0.16em] text-mist md:flex"><Link href="/shop" className="hover:text-white">Magazin</Link><Link href="/shop?featured=true" className="hover:text-white">Recomandate</Link><Link href="/account" className="hover:text-white">Cont</Link></nav><div className="flex items-center gap-2"><Link aria-label="Caută produse" href="/shop" className="grid size-10 place-items-center rounded-full border border-white/10 text-mist transition hover:border-acid hover:text-acid"><Search size={17} strokeWidth={1.5} /></Link><CartLink /><button type="button" aria-label={menuOpen ? "Închide meniul" : "Deschide meniul"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="grid size-10 place-items-center rounded-full border border-white/10 text-mist transition hover:border-acid hover:text-acid md:hidden">{menuOpen ? <X size={17} strokeWidth={1.5} /> : <Menu size={17} strokeWidth={1.5} />}</button></div></div>{menuOpen ? <nav className="glass-panel mt-2 grid gap-4 rounded-3xl p-5 text-xs uppercase tracking-[0.16em] text-mist md:hidden"><Link href="/shop" onClick={() => setMenuOpen(false)}>Magazin</Link><Link href="/shop?featured=true" onClick={() => setMenuOpen(false)}>Recomandate</Link><Link href="/account" onClick={() => setMenuOpen(false)}>Cont</Link></nav> : null}</div></header>;
}
