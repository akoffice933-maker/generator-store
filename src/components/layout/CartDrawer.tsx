"use client";

import Link from "next/link";
import Image from "next/image";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useStore } from "@/components/providers";
import { formatPrice } from "@/lib/format";

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen, updateQty, removeFromCart, segment, cartTotal } = useStore();

  if (!cartOpen) return null;

  const total = cartTotal(segment);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
      <div className="animate-fade-in relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#111317] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="font-display text-lg font-bold">Корзина</h3>
          <button onClick={() => setCartOpen(false)} className="rounded-full p-1.5 hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-gray-400">
              <ShoppingBag size={40} className="text-gray-600" />
              <p>Ваша корзина пуста</p>
              <Link
                href="/catalog"
                onClick={() => setCartOpen(false)}
                className="rounded-full bg-[#E0561E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#F26128]"
              >
                Перейти в каталог
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {cart.map((item) => (
                <li key={item.productId} className="flex gap-3 rounded-2xl border border-white/5 bg-[#15171c] p-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#1b1d23]">
                    {item.image && (
                      <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Link href={`/catalog/${item.slug}`} onClick={() => setCartOpen(false)} className="line-clamp-2 text-sm font-semibold hover:text-[#E0561E]">
                      {item.name}
                    </Link>
                    <p className="mt-1 text-sm font-bold text-[#E0561E]">
                      {formatPrice(segment === "b2b" ? item.priceWholesale : item.priceRetail)}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-full border border-white/10 px-1">
                        <button onClick={() => updateQty(item.productId, item.qty - 1)} className="p-1 text-gray-300 hover:text-white">
                          <Minus size={12} />
                        </button>
                        <span className="w-5 text-center text-sm">{item.qty}</span>
                        <button onClick={() => updateQty(item.productId, item.qty + 1)} className="p-1 text-gray-300 hover:text-white">
                          <Plus size={12} />
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(item.productId)} className="text-gray-500 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-white/10 px-5 py-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-gray-400">Итого ({segment === "b2b" ? "опт" : "розница"})</span>
              <span className="font-display text-lg font-bold">{formatPrice(total)}</span>
            </div>
            <Link
              href="/checkout"
              onClick={() => setCartOpen(false)}
              className="block w-full rounded-full bg-[#E0561E] px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#F26128]"
            >
              {segment === "b2b" ? "Оформить по опт-тарифу" : "Оформить заказ"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
