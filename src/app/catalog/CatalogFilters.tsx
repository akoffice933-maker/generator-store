"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/cn";

const TYPE_TABS = [
  { value: "all", label: "Все" },
  { value: "gasoline", label: "Бензиновые" },
  { value: "diesel", label: "Дизельные" },
  { value: "gas", label: "Газовые" },
  { value: "inverter", label: "Инверторные" },
];

const SORT_OPTIONS = [
  { value: "popular", label: "По умолчанию" },
  { value: "price_asc", label: "Цена: по возрастанию" },
  { value: "price_desc", label: "Цена: по убыванию" },
  { value: "power", label: "По мощности" },
];

export default function CatalogFilters({
  brands,
}: {
  brands: { id: number; name: string; slug: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [maxPower, setMaxPower] = useState(Number(searchParams.get("maxPower")) || 30);

  function updateParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    });
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const activeType = searchParams.get("type") || "all";
  const activeSort = searchParams.get("sort") || "popular";
  const activeBrand = searchParams.get("brand") || "";
  const activePhases = searchParams.get("phases") || "";
  const inStock = searchParams.get("inStock") === "1";

  function resetAll() {
    setSearch("");
    setMaxPower(30);
    router.push(pathname);
  }

  const hasActiveFilters =
    searchParams.get("search") ||
    activeType !== "all" ||
    activeBrand ||
    activePhases ||
    inStock ||
    searchParams.get("maxPower");

  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateParams({ search: search || null });
          }}
          className="flex flex-1 items-center gap-2 rounded-full border border-white/10 bg-[#111317] px-4 py-2.5"
        >
          <Search size={16} className="text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию, бренду..."
            className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
          />
        </form>
        <select
          value={activeSort}
          onChange={(e) => updateParams({ sort: e.target.value })}
          className="rounded-full border border-white/10 bg-[#111317] px-4 py-2.5 text-sm text-white focus:outline-none"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            "flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors",
            showFilters ? "border-[#E0561E] bg-[#E0561E]/10 text-[#E0561E]" : "border-white/10 text-gray-300 hover:text-white"
          )}
        >
          <SlidersHorizontal size={15} /> Фильтры
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => updateParams({ type: tab.value === "all" ? null : tab.value })}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              activeType === tab.value
                ? "border-[#E0561E] bg-[#E0561E] text-white"
                : "border-white/10 bg-[#111317] text-gray-300 hover:text-white"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 gap-5 rounded-2xl border border-white/10 bg-[#111317] p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Макс. мощность: {maxPower} кВт
            </label>
            <input
              type="range"
              min={3}
              max={30}
              value={maxPower}
              onChange={(e) => setMaxPower(Number(e.target.value))}
              onMouseUp={() => updateParams({ maxPower: String(maxPower) })}
              onTouchEnd={() => updateParams({ maxPower: String(maxPower) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">Бренд</label>
            <select
              value={activeBrand}
              onChange={(e) => updateParams({ brand: e.target.value || null })}
              className="w-full rounded-lg border border-white/10 bg-[#1b1d23] px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="">Все бренды</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.slug}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">Фазность</label>
            <div className="flex gap-2">
              {[
                { value: "", label: "Любая" },
                { value: "1", label: "1 фаза" },
                { value: "3", label: "3 фазы" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateParams({ phases: opt.value || null })}
                  className={cn(
                    "flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors",
                    activePhases === opt.value ? "border-[#E0561E] bg-[#E0561E]/10 text-[#E0561E]" : "border-white/10 text-gray-300"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => updateParams({ inStock: e.target.checked ? "1" : null })}
                className="h-4 w-4 rounded border-white/20 bg-[#1b1d23] accent-[#E0561E]"
              />
              Только в наличии
            </label>
          </div>
        </div>
      )}

      {hasActiveFilters ? (
        <button onClick={resetAll} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white">
          <X size={14} /> Сбросить фильтры
        </button>
      ) : null}
    </div>
  );
}
