"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calculator, ShoppingCart, Zap } from "lucide-react";
import { useStore } from "@/components/providers";
import { formatPrice } from "@/lib/format";
import type { ProductListItem } from "@/lib/products";

type Appliance = {
  id: string;
  label: string;
  watts: number;
  motor?: boolean;
};

const APPLIANCES: Appliance[] = [
  { id: "fridge", label: "Холодильник", watts: 200, motor: true },
  { id: "pump", label: "Скважинный насос", watts: 800, motor: true },
  { id: "lighting", label: "Освещение дома", watts: 300 },
  { id: "tv", label: "Телевизор", watts: 120 },
  { id: "router", label: "Wi-Fi роутер / ПК", watts: 150 },
  { id: "kettle", label: "Чайник / обогреватель", watts: 2000 },
  { id: "microwave", label: "Микроволновая печь", watts: 1000 },
  { id: "washer", label: "Стиральная машина", watts: 2000, motor: true },
  { id: "ac", label: "Кондиционер", watts: 1200, motor: true },
  { id: "tool", label: "Электроинструмент", watts: 1500, motor: true },
];

export default function PowerCalculator() {
  const [selected, setSelected] = useState<Record<string, boolean>>({ fridge: true, lighting: true, tv: true });
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const { segment, addToCart } = useStore();

  useEffect(() => {
    fetch("/api/products?pageSize=100&sort=power")
      .then((res) => res.json())
      .then((data) => setProducts(data.items || []));
  }, []);

  const { runningLoad, peakLoad, recommendedKw } = useMemo(() => {
    let running = 0;
    let maxMotorSurge = 0;
    for (const item of APPLIANCES) {
      if (!selected[item.id]) continue;
      running += item.watts;
      if (item.motor) {
        const surge = item.watts * 2.5 - item.watts;
        if (surge > maxMotorSurge) maxMotorSurge = surge;
      }
    }
    const peak = running + maxMotorSurge;
    const withMargin = peak * 1.2;
    return { runningLoad: running, peakLoad: peak, recommendedKw: withMargin / 1000 };
  }, [selected]);

  const recommendation = useMemo(() => {
    if (products.length === 0 || runningLoad === 0) return null;
    const suitable = products
      .filter((p) => Number(p.powerKw) >= recommendedKw)
      .sort((a, b) => Number(a.powerKw) - Number(b.powerKw) || Number(a.priceRetail) - Number(b.priceRetail));
    return suitable[0] || products[products.length - 1];
  }, [products, recommendedKw, runningLoad]);

  return (
    <div className="grid grid-cols-1 gap-8 rounded-3xl border border-white/10 bg-[#111317] p-6 sm:p-8 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <div className="mb-5 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E0561E]/15 text-[#E0561E]">
            <Calculator size={18} />
          </span>
          <h3 className="font-display text-xl font-bold">Умный калькулятор подбора мощности</h3>
        </div>
        <p className="mb-5 text-sm text-gray-400">
          Отметьте приборы, которые нужно запитать от генератора. Мы учтём пусковые токи и добавим запас 20%.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {APPLIANCES.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#1b1d23] px-3 py-2.5 text-sm"
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!selected[item.id]}
                  onChange={(e) => setSelected((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                  className="h-4 w-4 accent-[#E0561E]"
                />
                {item.label}
              </span>
              <span className="text-xs text-gray-500">{item.watts} Вт</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col justify-between rounded-2xl bg-[#15171c] p-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Суммарная нагрузка</p>
          <p className="font-display text-2xl font-bold">{(runningLoad / 1000).toFixed(2)} кВт</p>
          <p className="mt-1 text-xs text-gray-500">Пиковая нагрузка с пусковыми токами: {(peakLoad / 1000).toFixed(2)} кВт</p>
          <p className="mt-3 text-sm text-gray-300">
            Рекомендуемая мощность генератора (с запасом 20%): <span className="font-bold text-[#E0561E]">{recommendedKw.toFixed(2)} кВт</span>
          </p>
        </div>

        {recommendation ? (
          <div className="mt-5 rounded-xl border border-white/10 bg-[#111317] p-4">
            <div className="flex gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#1b1d23]">
                <Image src={recommendation.images?.[0] || "/images/gen-gasoline-1.jpg"} alt={recommendation.name} fill className="object-cover" />
              </div>
              <div>
                <Link href={`/catalog/${recommendation.slug}`} className="text-sm font-semibold hover:text-[#E0561E]">
                  {recommendation.name}
                </Link>
                <p className="mt-1 flex items-center gap-1 text-xs text-gray-400"><Zap size={12} /> {recommendation.powerKw} кВт</p>
                <p className="mt-1 font-display text-base font-bold text-[#E0561E]">
                  {formatPrice(segment === "b2b" ? recommendation.priceWholesale : recommendation.priceRetail)}
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                addToCart({
                  productId: recommendation.id,
                  slug: recommendation.slug,
                  name: recommendation.name,
                  image: recommendation.images?.[0] || null,
                  priceRetail: Number(recommendation.priceRetail),
                  priceWholesale: Number(recommendation.priceWholesale),
                  stock: recommendation.stock,
                })
              }
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#E0561E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#F26128]"
            >
              <ShoppingCart size={15} /> Добавить в корзину
            </button>
          </div>
        ) : (
          <p className="mt-5 text-sm text-gray-500">Отметьте хотя бы один прибор, чтобы получить рекомендацию.</p>
        )}
      </div>
    </div>
  );
}
