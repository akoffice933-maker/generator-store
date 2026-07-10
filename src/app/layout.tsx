import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Unbounded, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/layout/CartDrawer";

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-unbounded",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Generator Store — генераторы и системы резервного электроснабжения",
  description:
    "Generator Store — интернет-магазин бензиновых, дизельных, газовых и инверторных генераторов для дома и бизнеса. Розница и опт, гарантия до 5 лет, доставка по РФ.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={`${unbounded.variable} ${jakarta.variable}`}>
      <body className="font-body bg-[#0a0b0d] text-white antialiased">
        <AppProviders>
          <Header />
          <CartDrawer />
          {children}
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
