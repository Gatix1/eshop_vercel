import Link from "next/link";

export function AuthLayout({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <main className="grid min-h-screen place-items-center px-5 py-16"><div className="w-full max-w-md"><Link href="/" className="font-serif text-3xl text-white">e<span className="text-acid">.</span>Shop</Link><div className="glass-panel mt-8 rounded-[2rem] p-7 sm:p-10"><p className="text-[10px] uppercase tracking-[0.22em] text-acid">{eyebrow}</p><h1 className="mt-4 mb-8 font-serif text-5xl leading-none text-white">{title}</h1>{children}</div></div></main>;
}
