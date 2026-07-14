"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, GitCompare, ShoppingCart, Gauge, Fuel, Weight, Volume2 } from "lucide-react";
import { useStore } from "@/components/providers";
import { formatPrice, typeLabels } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ProductListItem } from "@/lib/products";

export default function ProductCard({ product }: { product: ProductListItem }) {
  const { addToCart, favorites, toggleFavorite, compare, toggleCompare } = useStore();
  const isFav = favorites.includes(product.id);
  const isCompared = compare.includes(product.id);
  const image = product.images?.[0] || "/images/gen-gasoline-1.jpg";
  const price = Number(product.priceWholesale ?? product.priceRetail);
  const hasWholesalePrice = product.priceWholesale !== null;
  const outOfStock = product.stock <= 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#111317] transition-all duration-300 hover:-translate-y-1 hover:border-white/10 hover:shadow-xl hover:shadow-black/40">
      <div className="relative aspect-square overflow-hidden bg-[#15171c]">
        <Link href={`/catalog/${product.slug}`}>
          <Image src={image} alt={product.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        </Link>
        <div className="absolute left-2 top-2 flex flex-col gap-1.5">
          <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">{typeLabels[product.type]}</span>
          <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">{product.powerKw} кВт</span>
        </div>
        <button onClick={() => toggleFavorite(product.id)} aria-label="Добавить в избранное" className={cn("absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur transition-colors", isFav ? "bg-[#E0561E] text-white" : "bg-black/50 text-gray-300 hover:text-white")}>
          <Heart size={15} fill={isFav ? "currentColor" : "none"} />
        </button>
        {outOfStock && <div className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-xs font-semibold text-gray-300">Нет в наличии</div>}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {product.brandName && <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{product.brandName}</p>}
        <Link href={`/catalog/${product.slug}`} className="mt-1 line-clamp-2 font-display text-sm font-semibold leading-snug hover:text-[#E0561E]">{product.name}</Link>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-gray-400">
          <span className="flex items-center gap-1"><Gauge size={12} /> {product.phases} фаза(ы)</span>
          {product.tankL ? <span className="flex items-center gap-1"><Fuel size={12} /> {product.tankL} л</span> : <span />}
          {product.weightKg ? <span className="flex items-center gap-1"><Weight size={12} /> {product.weightKg} кг</span> : <span />}
          {product.noiseDb ? <span className="flex items-center gap-1"><Volume2 size={12} /> {product.noiseDb} дБ</span> : <span />}
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            {hasWholesalePrice && <p className="text-[11px] text-gray-500 line-through">{formatPrice(product.priceRetail)}</p>}
            <p className={cn("font-display text-lg font-bold", hasWholesalePrice ? "text-[#E0561E]" : "text-white")}>{formatPrice(price)}</p>
            {hasWholesalePrice && <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#E0561E]">Одобренная B2B-цена</p>}
          </div>
          <button onClick={() => toggleCompare(product.id)} aria-label="Сравнить товар" className={cn("flex h-8 w-8 items-center justify-center rounded-full border transition-colors", isCompared ? "border-[#E0561E] bg-[#E0561E]/10 text-[#E0561E]" : "border-white/10 text-gray-400 hover:text-white")}>
            <GitCompare size={14} />
          </button>
        </div>
        <button disabled={outOfStock} onClick={() => addToCart({ productId: product.id, slug: product.slug, name: product.name, image, unitPrice: price, stock: product.stock })} className={cn("mt-3 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors", outOfStock ? "cursor-not-allowed bg-white/5 text-gray-500" : "bg-[#E0561E] text-white hover:bg-[#F26128]")}>
          <ShoppingCart size={15} /> {outOfStock ? "Нет в наличии" : "В корзину"}
        </button>
      </div>
    </div>
  );
}
