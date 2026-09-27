import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart-provider";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "eShop | Tehnologie aleasă cu grijă",
  description: "Calculatoare, telefoane, componente și accesorii pentru setup-ul tău.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: { title: "eShop | Tehnologie aleasă cu grijă", description: "Calculatoare, telefoane, componente și accesorii pentru setup-ul tău.", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ro">
      <body className={`${manrope.variable} ${cormorant.variable}`}><CartProvider>{children}</CartProvider></body>
    </html>
  );
}
