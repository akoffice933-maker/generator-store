"use client";

import { useEffect, useState } from "react";
import { BarChart3, ClipboardList, Package, Users } from "lucide-react";
import { formatPrice } from "@/lib/format";

type Stats = { totalOrders: number; totalRevenue: string; newLeads: number; totalProducts: number; totalUsers: number; last30Revenue: string; last30Count: number };

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => { void fetch("/api/admin/stats", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((data) => setStats(data)); }, []);
  if (!stats) return <p className="text-gray-400">Загрузка показателей…</p>;
  const cards = [{ icon: ClipboardList, label: "Заказы", value: stats.totalOrders }, { icon: BarChart3, label: "Выручка", value: formatPrice(stats.totalRevenue) }, { icon: Package, label: "Товары", value: stats.totalProducts }, { icon: Users, label: "Пользователи", value: stats.totalUsers }];
  return <div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-2xl border border-white/10 bg-[#111317] p-5"><card.icon size={20} className="text-[#E0561E]"/><p className="mt-4 text-sm text-gray-400">{card.label}</p><p className="font-display mt-1 text-2xl font-bold">{card.value}</p></div>)}</div><div className="mt-6 rounded-2xl border border-white/10 bg-[#111317] p-6"><h2 className="font-display text-lg font-bold">За 30 дней</h2><p className="mt-3 text-sm text-gray-400">Заказов: <strong className="text-white">{stats.last30Count}</strong></p><p className="mt-1 text-sm text-gray-400">Выручка: <strong className="text-white">{formatPrice(stats.last30Revenue)}</strong></p><p className="mt-5 text-sm text-gray-400">REST API для управления товарами, заказами, лидерами и пользователями доступен на `/api/admin/*`. Перед production рекомендуется добавить полноценные CRUD-экраны с журналом аудита.</p></div></div>;
}
