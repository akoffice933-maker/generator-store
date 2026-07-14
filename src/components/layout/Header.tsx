"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, X, Heart, GitCompare, ShoppingCart, User, Zap, Search } from "lucide-react";
import { useStore } from "@/components/providers";
import { cn } from "@/lib/cn";

const NAV_LINKS = [
  { href: "/#hero", label: "Главная" },
  { href: "/catalog", label: "Каталог" },
  { href: "/delivery", label: "Доставка и оплата" },
  { href: "/service", label: "Гарантия и сервис" },
  { href: "/blog", label: "Блог" },
  { href: "/contacts", label: "Контакты" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { segment, setSegment, favorites, compare, cartCount, setCartOpen, user } = useStore();
  const hasWholesaleAccess = user?.canUseWholesale ?? false;
  const router = useRouter();
  const [search, setSearch] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);


  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/catalog?search=${encodeURIComponent(search)}`);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-all duration-300",
        scrolled
          ? "border-white/10 bg-[#0a0b0d]/85 backdrop-blur-md"
          : "border-transparent bg-[#0a0b0d]"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#B23F12] to-[#FF6B35] shadow-lg shadow-orange-900/30">
            <Zap size={18} className="fill-white text-white" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Generator<span className="text-[#E0561E]">Store</span>
          </span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={onSearchSubmit} className="hidden max-w-[220px] flex-1 items-center xl:flex">
          <div className="flex w-full items-center gap-2 rounded-full border border-white/10 bg-[#15171c] px-3 py-1.5">
            <Search size={14} className="text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск генератора..."
              className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
            />
          </div>
        </form>

        <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-[#111317] p-1 text-xs font-semibold md:flex">
          <button
            onClick={() => setSegment("b2c")}
            className={cn(
              "rounded-full px-3 py-1.5 transition-colors",
              segment === "b2c" ? "bg-[#E0561E] text-white" : "text-gray-400 hover:text-white"
            )}
          >
            Физлицо
          </button>
          <button
            disabled={!hasWholesaleAccess}
            title={hasWholesaleAccess ? "Показывать B2B-цены" : "B2B-цены доступны после одобрения заявки"}
            onClick={() => setSegment("b2b")}
            className={cn(
              "rounded-full px-3 py-1.5 transition-colors",
              segment === "b2b" && hasWholesaleAccess ? "bg-[#E0561E] text-white" : "text-gray-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            Бизнес
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/account?tab=favorites"
            className="relative hidden h-9 w-9 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-white/5 hover:text-white sm:flex"
          >
            <Heart size={18} />
            {favorites.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#E0561E] text-[10px] font-bold">
                {favorites.length}
              </span>
            )}
          </Link>
          {compare.length > 0 && (
            <Link
              href="/catalog?compare=1"
              className="relative hidden h-9 w-9 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-white/5 hover:text-white sm:flex"
            >
              <GitCompare size={18} />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#E0561E] text-[10px] font-bold">
                {compare.length}
              </span>
            </Link>
          )}
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ShoppingCart size={18} />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#E0561E] text-[10px] font-bold">
                {cartCount}
              </span>
            )}
          </button>
          <Link
            href={user ? "/account" : "/login"}
            className="hidden h-9 w-9 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-white/5 hover:text-white sm:flex"
          >
            <User size={18} />
          </Link>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-300 hover:bg-white/5 hover:text-white lg:hidden"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#0a0b0d] px-4 pb-6 pt-2 lg:hidden">
          <form onSubmit={onSearchSubmit} className="mb-3 flex items-center gap-2 rounded-full border border-white/10 bg-[#15171c] px-3 py-2">
            <Search size={14} className="text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск генератора..."
              className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
            />
          </form>
          <div className="mb-3 flex items-center gap-1 rounded-full border border-white/10 bg-[#111317] p-1 text-xs font-semibold">
            <button
              onClick={() => setSegment("b2c")}
              className={cn("flex-1 rounded-full px-3 py-2", segment === "b2c" ? "bg-[#E0561E] text-white" : "text-gray-400")}
            >
              Физлицо
            </button>
            <button
              disabled={!hasWholesaleAccess}
            title={hasWholesaleAccess ? "Показывать B2B-цены" : "B2B-цены доступны после одобрения заявки"}
            onClick={() => setSegment("b2b")}
              className={cn("flex-1 rounded-full px-3 py-2 disabled:opacity-50", segment === "b2b" && hasWholesaleAccess ? "bg-[#E0561E] text-white" : "text-gray-400")}
            >
              Бизнес
            </button>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/5">
                {link.label}
              </Link>
            ))}
            <Link href={user ? "/account" : "/login"} className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/5">
              {user ? "Личный кабинет" : "Войти"}
            </Link>
            <Link href="/account?tab=favorites" className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/5">
              Избранное {favorites.length > 0 ? `(${favorites.length})` : ""}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
