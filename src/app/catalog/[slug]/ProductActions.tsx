"use client";

import { useState } from "react";
import { Heart, ShoppingCart, Minus, Plus } from "lucide-react";
import { useStore } from "@/components/providers";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function ProductActions({
  productId,
  slug,
  name,
  image,
  priceRetail,
  priceWholesale,
  stock,
}: {
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  priceRetail: number;
  priceWholesale: number;
  stock: number;
}) {
  const { segment, addToCart, favorites, toggleFavorite } = useStore();
  const [qty, setQty] = useState(1);
  const isFav = favorites.includes(productId);
  const outOfStock = stock <= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        {segment === "b2b" ? (
          <>
            <span className="text-lg text-gray-500 line-through">{formatPrice(priceRetail)}</span>
            <span className="font-display text-3xl font-bold text-[#E0561E]">{formatPrice(priceWholesale)}</span>
            <span className="rounded-full bg-[#E0561E]/10 px-2.5 py-1 text-xs font-semibold text-[#E0561E]">
              Экономия {formatPrice(priceRetail - priceWholesale)}
            </span>
          </>
        ) : (
          <span className="font-display text-3xl font-bold">{formatPrice(priceRetail)}</span>
        )}
      </div>

      <p className={cn("text-sm font-medium", outOfStock ? "text-gray-500" : "text-emerald-400")}>
        {outOfStock ? "Нет в наличии — доступен предзаказ" : `В наличии: ${stock} шт.`}
      </p>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 rounded-full border border-white/10 px-3 py-2">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="text-gray-300 hover:text-white">
            <Minus size={14} />
          </button>
          <span className="w-6 text-center">{qty}</span>
          <button onClick={() => setQty((q) => Math.min(stock || 99, q + 1))} className="text-gray-300 hover:text-white">
            <Plus size={14} />
          </button>
        </div>
        <button
          onClick={() =>
            addToCart(
              { productId, slug, name, image, priceRetail, priceWholesale, stock },
              qty
            )
          }
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#E0561E] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#F26128]"
        >
          <ShoppingCart size={16} />
          {segment === "b2b" ? "Оформить по опт-тарифу" : "Добавить в корзину"}
        </button>
        <button
          onClick={() => toggleFavorite(productId)}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full border transition-colors",
            isFav ? "border-[#E0561E] bg-[#E0561E]/10 text-[#E0561E]" : "border-white/10 text-gray-300 hover:text-white"
          )}
        >
          <Heart size={17} fill={isFav ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  );
}
