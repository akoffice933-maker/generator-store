"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogOut, Package, ShieldCheck, UserRound } from "lucide-react";
import { useStore } from "@/components/providers";
import { formatDate, formatPrice } from "@/lib/format";

type Order = { id: number; orderNumber: string; status: string; totalAmount: string; createdAt: string; paymentMethod: string; items: { id: number; productName: string; qty: number; price: string }[] };

const statusLabels: Record<string, string> = { new: "Создан", paid: "Оплачен", processing: "В обработке", shipped: "Передан в доставку", completed: "Завершён", cancelled: "Отменён" };

export default function AccountClient() {
  const router = useRouter(); const search = useSearchParams(); const { user, refreshUser, favorites } = useStore();
  const [orders, setOrders] = useState<Order[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { void (async () => { await refreshUser(); const response = await fetch("/api/orders", { cache: "no-store" }); if (response.ok) { const data = await response.json(); setOrders(data.orders ?? []); } setLoading(false); })(); }, [refreshUser]);
  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, router, user]);
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); await refreshUser(); router.replace("/"); router.refresh(); }
  if (!user && !loading) return null;
  const selectedFavorites = search.get("tab") === "favorites";
  return <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><span className="text-sm font-semibold uppercase tracking-wide text-[#E0561E]">Личный кабинет</span><h1 className="font-display mt-2 text-3xl font-bold">{user?.name || "Загрузка…"}</h1></div><button onClick={logout} className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-gray-300 hover:text-white"><LogOut size={15}/> Выйти</button></div>
    {user && <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-[#111317] p-5"><UserRound className="text-[#E0561E]" size={20}/><p className="mt-3 text-sm text-gray-400">{user.email}</p><p className="mt-1 text-sm font-semibold">{user.role === "customer" ? "Покупатель" : "Сотрудник"}</p></div><div className="rounded-2xl border border-white/10 bg-[#111317] p-5"><ShieldCheck className="text-[#E0561E]" size={20}/><p className="mt-3 text-sm text-gray-400">B2B-статус</p><p className="mt-1 text-sm font-semibold">{user.canUseWholesale ? "Одобрен" : user.b2bStatus === "pending" ? "На проверке" : "Не активирован"}</p></div><div className="rounded-2xl border border-white/10 bg-[#111317] p-5"><Package className="text-[#E0561E]" size={20}/><p className="mt-3 text-sm text-gray-400">Избранное</p><p className="mt-1 text-sm font-semibold">{favorites.length} товаров</p></div></div>}
    {selectedFavorites && <p className="mt-8 rounded-2xl border border-white/10 bg-[#111317] p-5 text-sm text-gray-400">Избранное синхронизируется с учётной записью после входа. Список товаров можно открыть из каталога по значку сердца; расширенная страница избранного появится в следующем улучшении интерфейса.</p>}
    <section className="mt-10"><h2 className="font-display text-xl font-bold">Мои заказы</h2>{loading ? <p className="mt-4 text-sm text-gray-400">Загрузка…</p> : orders.length === 0 ? <p className="mt-4 rounded-2xl border border-white/10 bg-[#111317] p-5 text-sm text-gray-400">Заказов пока нет.</p> : <div className="mt-4 space-y-3">{orders.map((order) => <article key={order.id} className="rounded-2xl border border-white/10 bg-[#111317] p-5"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-display font-semibold">{order.orderNumber}</h3><p className="mt-1 text-xs text-gray-500">{formatDate(order.createdAt)} · {order.paymentMethod === "invoice" ? "Счёт" : "Онлайн-оплата"}</p></div><div className="text-right"><p className="font-semibold">{formatPrice(order.totalAmount)}</p><p className="mt-1 text-xs text-[#E0561E]">{statusLabels[order.status] ?? order.status}</p></div></div><ul className="mt-4 border-t border-white/5 pt-3 text-sm text-gray-400">{order.items.map((item) => <li key={item.id}>{item.productName} × {item.qty}</li>)}</ul></article>)}</div>}</section>
  </main>;
}
