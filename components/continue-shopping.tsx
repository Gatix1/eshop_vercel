"use client";

import { ArrowRight } from "lucide-react";

export function ContinueShopping() {
  return <button type="button" onClick={() => window.location.assign("/shop")} className="mt-10 inline-flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-acid">Continue shopping <ArrowRight size={15} /></button>;
}
