"use client";

import { useMemo, useState } from "react";
import { Truck, MapPin } from "lucide-react";
import { formatPrice } from "@/lib/format";

const CITIES: { name: string; baseCost: number; days: string }[] = [
  { name: "Сочи (склад)", baseCost: 0, days: "В день заказа" },
  { name: "Краснодар", baseCost: 1800, days: "1-2 дня" },
  { name: "Ростов-на-Дону", baseCost: 2600, days: "2-3 дня" },
  { name: "Москва", baseCost: 4200, days: "3-5 дней" },
  { name: "Санкт-Петербург", baseCost: 4800, days: "4-6 дней" },
  { name: "Екатеринбург", baseCost: 5400, days: "5-7 дней" },
  { name: "Московская область (от МКАД)", baseCost: 3800, days: "3-5 дней" },
];

export default function DeliveryCalculator() {
  const [city, setCity] = useState(CITIES[1].name);
  const [distanceKm, setDistanceKm] = useState(20);
  const [heavy, setHeavy] = useState(false);

  const selected = CITIES.find((c) => c.name === city) || CITIES[0];
  const isMoscowRegion = city.includes("Московская область");

  const cost = useMemo(() => {
    if (heavy) return null;
    let total = selected.baseCost;
    if (isMoscowRegion) total += Math.max(0, distanceKm - 10) * 45;
    return total;
  }, [selected, isMoscowRegion, distanceKm, heavy]);

  return (
    <div className="rounded-3xl border border-white/10 bg-[#111317] p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E0561E]/15 text-[#E0561E]">
          <Truck size={18} />
        </span>
        <h3 className="font-display text-xl font-bold">Калькулятор доставки</h3>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">Город доставки</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#1b1d23] px-3 py-2.5 text-sm text-white focus:outline-none"
          >
            {CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {isMoscowRegion && (
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Расстояние от МКАД, км: {distanceKm}
            </label>
            <input
              type="range"
              min={0}
              max={150}
              value={distanceKm}
              onChange={(e) => setDistanceKm(Number(e.target.value))}
              className="w-full"
            />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-gray-300 sm:col-span-2">
          <input type="checkbox" checked={heavy} onChange={(e) => setHeavy(e.target.checked)} className="h-4 w-4 accent-[#E0561E]" />
          Промышленная модель от 15 кВт / от 300 кг (расчёт индивидуально)
        </label>
      </div>

      <div className="mt-6 rounded-2xl bg-[#15171c] p-5">
        {heavy ? (
          <p className="text-sm text-gray-300">
            Для тяжёлых промышленных генераторов стоимость и сроки доставки рассчитываются индивидуально.
            Оставьте заявку на странице «Контакты» — менеджер свяжется с вами в течение часа.
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <MapPin size={15} className="text-[#E0561E]" /> Срок доставки: {selected.days}
            </div>
            <p className="font-display text-2xl font-bold">
              {cost === 0 ? "Бесплатно" : formatPrice(cost || 0)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
