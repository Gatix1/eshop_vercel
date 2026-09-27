import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Cpu, Headphones, Laptop, Monitor, Mouse, Package, Smartphone, Sparkles } from "lucide-react";
import { HomeHeader } from "@/components/home-header";
import { getCategories, getProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { ScrollReveal } from "@/components/scroll-reveal";

const categoryFallback = [
  { name: "Calculatoare", slug: "calculatoare", icon: Laptop, detail: "Putere pentru fiecare zi" },
  { name: "Telefoane", slug: "telefoane", icon: Smartphone, detail: "Conectat la ce contează" },
  { name: "Componente", slug: "componente", icon: Cpu, detail: "Construiește în ritmul tău" },
  { name: "Periferice", slug: "periferice", icon: Mouse, detail: "Detaliile fac diferența" },
];

export default async function Home() {
  const [{ products }, categories] = await Promise.all([
    getProducts({ page: 1 }),
    getCategories(),
  ]);
  const featured = products.slice(0, 4);
  const categoryItems = categories.length
    ? categories.slice(0, 4).map((category, index) => ({ ...category, icon: [Laptop, Smartphone, Cpu, Mouse][index % 4], detail: categoryFallback[index % 4].detail }))
    : categoryFallback;

  return <main className="home-shell min-h-screen overflow-hidden">
    <HomeHeader />

    <section id="top" className="home-hero relative mx-auto grid max-w-[1440px] items-center gap-10 px-5 pb-20 pt-12 sm:px-8 md:min-h-[700px] md:grid-cols-[1fr_0.92fr] md:px-12 md:pb-28 md:pt-16">
      <div className="hero-copy relative z-10">
        <p className="eyebrow mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-acid"><Sparkles size={13} /> Tehnologie aleasă cu grijă</p>
        <h1 className="max-w-3xl font-serif text-6xl leading-[0.92] text-white sm:text-7xl md:text-[6.7rem]">Spațiu pentru<br /><em className="font-light text-acid">idei mai bune.</em></h1>
        <p className="mt-7 max-w-md text-sm leading-7 text-mist sm:text-base">Dispozitive, componente și accesorii care fac locul tău de lucru mai personal, mai simplu și mai capabil.</p>
        <div className="mt-9 flex flex-wrap items-center gap-4"><Link href="/shop" className="inline-flex min-h-12 items-center gap-3 rounded-full bg-acid px-6 text-xs font-semibold uppercase tracking-[0.15em] text-ink transition hover:bg-white">Descoperă colecția <ArrowUpRight size={16} /></Link><a href="#categorii" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 text-xs text-white transition hover:border-white/35"><ArrowDownRight size={15} /> Explorează categoriile</a></div>
        <div className="mt-12 flex items-center gap-3 text-xs text-mist"><span className="flex -space-x-2"><span className="grid size-8 place-items-center rounded-full border border-white/20 bg-[#25302a]"><Monitor size={14} /></span><span className="grid size-8 place-items-center rounded-full border border-white/20 bg-[#25302a]"><Headphones size={14} /></span><span className="grid size-8 place-items-center rounded-full border border-white/20 bg-[#25302a]"><Package size={14} /></span></span><span>Tot ce-ți trebuie pentru următorul upgrade.</span></div>
      </div>

      <div className="hero-visual relative mx-auto aspect-[0.94] w-full max-w-[590px] md:aspect-[0.95]">
        <div className="hero-light hero-light-lime" />
        <div className="hero-light hero-light-cyan" />
        <div className="hero-device glass-panel absolute inset-[7%] overflow-hidden rounded-[2rem]">
          <div className="hero-device-screen absolute inset-[5%] overflow-hidden rounded-[1.55rem] border border-white/20">
            <div className="device-shine absolute inset-0" />
            <div className="device-arc device-arc-one" />
            <div className="device-arc device-arc-two" />
            <div className="absolute inset-x-8 top-8 flex items-center justify-between text-[9px] uppercase tracking-[0.22em] text-white/55"><span>eShop / Chișinău</span><span>01—04</span></div>
            <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between"><div><p className="text-[9px] uppercase tracking-[0.24em] text-acid">Alege mai bine</p><p className="mt-2 font-serif text-4xl leading-none text-white sm:text-5xl">Tech, cu sens.</p></div><span className="grid size-11 place-items-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-xl"><ArrowUpRight size={17} /></span></div>
          </div>
        </div>
        <div className="glass-panel hero-float hero-float-top absolute right-0 top-[12%] rounded-2xl px-4 py-3"><p className="text-[9px] uppercase tracking-[0.18em] text-mist">Selecție atentă</p><p className="mt-1 text-sm text-white">Pentru ritmul tău</p></div>
        <div className="glass-panel hero-float hero-float-bottom absolute bottom-[4%] left-0 rounded-2xl px-4 py-3"><p className="flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-mist"><span className="size-1.5 rounded-full bg-acid" /> Chișinău, Moldova</p><p className="mt-1 text-sm text-white">Tehnologie aproape de tine</p></div>
      </div>
    </section>

    <ScrollReveal><section id="categorii" className="relative mx-auto max-w-[1320px] px-5 py-16 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1320px]"><div className="mb-8 flex items-end justify-between gap-5"><div><p className="eyebrow text-[10px] uppercase tracking-[0.22em] text-acid">Explorează după nevoie</p><h2 className="mt-3 font-serif text-4xl text-white sm:text-5xl">Alege direcția.</h2></div><Link href="/shop" className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-mist transition hover:border-white/30 hover:text-white sm:inline-flex">Vezi toate <ArrowUpRight size={14} /></Link></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{categoryItems.map(({ name, slug, icon: Icon, detail }) => <Link href={`/shop?category=${slug}`} key={slug} className="glass-panel category-tile group rounded-[1.4rem] p-5 transition duration-300 hover:-translate-y-1 hover:border-white/25 sm:p-6"><div className="flex items-start justify-between"><span className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.055] text-acid"><Icon size={20} strokeWidth={1.5} /></span><ArrowUpRight className="text-white/35 transition group-hover:text-acid" size={17} /></div><p className="mt-10 text-base text-white">{name}</p><p className="mt-1 text-xs text-mist">{detail}</p></Link>)}</div>
      </div>
    </section></ScrollReveal>

    <ScrollReveal><section id="shop" className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8 lg:px-12"><div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="eyebrow text-[10px] uppercase tracking-[0.22em] text-acid">Selecția eShop</p><h2 className="mt-3 font-serif text-4xl text-white sm:text-5xl">Preferatele noastre.</h2><p className="mt-3 max-w-lg text-sm leading-6 text-mist">Produse alese pentru performanță, confort și un setup care ți se potrivește.</p></div><Link href="/shop" className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-xs text-white transition hover:border-acid/60 hover:text-acid">Vezi catalogul <ArrowUpRight size={15} /></Link></div>
      {featured.length ? <div className="mt-9 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">{featured.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="glass-panel mt-9 flex min-h-56 flex-col justify-center rounded-[1.5rem] p-8 sm:p-10"><p className="text-[10px] uppercase tracking-[0.22em] text-acid">În curând</p><h3 className="mt-3 font-serif text-4xl text-white">Primul tău upgrade începe aici.</h3><p className="mt-3 max-w-lg text-sm leading-6 text-mist">Pregătim o selecție de tehnologie pentru muncă, creație și timpul tău liber.</p></div>}
    </section></ScrollReveal>

    <footer id="despre" className="px-5 pb-8 sm:px-8 lg:px-12"><div className="glass-panel mx-auto flex max-w-[1320px] flex-col justify-between gap-3 rounded-[1.3rem] px-6 py-5 text-[10px] uppercase tracking-[0.17em] text-mist sm:flex-row sm:items-center"><span>e<span className="text-acid">.</span>Shop / Chișinău, Moldova</span><div className="flex flex-wrap gap-x-5 gap-y-2"><Link href="/terms" className="hover:text-white">Termeni</Link><Link href="/privacy" className="hover:text-white">Confidențialitate</Link><Link href="/shipping-returns" className="hover:text-white">Livrare și retur</Link><Link href="/contact" className="hover:text-white">Contact</Link></div></div></footer>
  </main>;
}
