"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { GitCompare, X } from "lucide-react";
import { useStore } from "@/components/providers";
import { formatPrice, typeLabels, startTypeLabels } from "@/lib/format";
import type { ProductListItem } from "@/lib/products";

export default function CompareBar() {
  const { compare, toggleCompare, clearCompare } = useStore();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!compare.length) return;
    const controller = new AbortController();
    async function loadProducts() {
      setLoading(true);
      try {
        const response = await fetch("/api/products?pageSize=48", { signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load compared products");
        const data = await response.json();
        if (!controller.signal.aborted) setItems((data.items ?? []).filter((product: ProductListItem) => compare.includes(product.id)));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setItems([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadProducts();
    return () => controller.abort();
  }, [compare]);

  if (compare.length === 0) return null;
  const rows: { label: string; render: (product: ProductListItem) => string }[] = [
    { label: "Тип", render: (product) => typeLabels[product.type] }, { label: "Мощность", render: (product) => `${product.powerKw} кВт` }, { label: "Фазы", render: (product) => `${product.phases}` }, { label: "Запуск", render: (product) => startTypeLabels[product.startType] },
    { label: "Бак", render: (product) => product.tankL ? `${product.tankL} л` : "—" }, { label: "Расход топлива", render: (product) => product.fuelConsumption ? `${product.fuelConsumption} л/ч` : "—" }, { label: "Вес", render: (product) => product.weightKg ? `${product.weightKg} кг` : "—" }, { label: "Шум", render: (product) => product.noiseDb ? `${product.noiseDb} дБ` : "—" }, { label: "Наличие", render: (product) => product.stock > 0 ? "В наличии" : "Под заказ" }, { label: "Цена", render: (product) => formatPrice(product.priceWholesale ?? product.priceRetail) },
  ];
  return <><div className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-md -translate-x-1/2"><div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111317]/95 px-4 py-3 shadow-2xl backdrop-blur"><div className="flex items-center gap-2 text-sm font-semibold"><GitCompare size={16} className="text-[#E0561E]"/>Сравнение: {compare.length}</div><div className="flex items-center gap-2"><button onClick={() => setOpen(true)} className="rounded-full bg-[#E0561E] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#F26128]">Сравнить</button><button onClick={clearCompare} aria-label="Очистить сравнение" className="rounded-full p-1.5 text-gray-400 hover:text-white"><X size={16}/></button></div></div></div>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)}/><div className="scrollbar-thin relative max-h-[85vh] w-full max-w-4xl overflow-auto rounded-2xl border border-white/10 bg-[#111317] p-6"><div className="mb-4 flex items-center justify-between"><h3 className="font-display text-lg font-bold">Сравнение характеристик</h3><button onClick={() => setOpen(false)} aria-label="Закрыть" className="rounded-full p-1.5 hover:bg-white/5"><X size={18}/></button></div>{loading ? <p className="text-gray-400">Загрузка…</p> : <div className="overflow-x-auto"><table className="w-full min-w-[600px] border-collapse text-sm"><thead><tr><th className="p-2 text-left text-gray-500">Модель</th>{items.map((product) => <th key={product.id} className="p-2 text-left"><div className="flex flex-col items-start gap-2"><div className="relative h-16 w-16 overflow-hidden rounded-lg bg-[#1b1d23]"><Image src={product.images?.[0] || "/images/gen-gasoline-1.jpg"} alt={product.name} fill className="object-cover"/></div><span className="font-semibold">{product.name}</span><button onClick={() => toggleCompare(product.id)} className="text-xs text-gray-500 hover:text-red-400">Убрать</button></div></th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.label} className="border-t border-white/5"><td className="p-2 font-medium text-gray-400">{row.label}</td>{items.map((product) => <td key={product.id} className="p-2">{row.render(product)}</td>)}</tr>)}</tbody></table></div>}</div></div>}</>;
}
