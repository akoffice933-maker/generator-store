"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/providers";

export default function LoginForm() {
  const router = useRouter();
  const { refreshUser } = useStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", segment: "b2c", companyName: "", inn: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mode === "login" ? { email: form.email, password: form.password } : form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось выполнить запрос");
      await refreshUser();
      router.replace("/account"); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Не удалось выполнить запрос"); }
    finally { setLoading(false); }
  }

  return <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-[#111317] p-6 sm:p-8"><div className="flex rounded-full bg-[#15171c] p-1 text-sm"><button onClick={() => setMode("login")} className={`flex-1 rounded-full px-3 py-2 ${mode === "login" ? "bg-[#E0561E] text-white" : "text-gray-400"}`}>Войти</button><button onClick={() => setMode("register")} className={`flex-1 rounded-full px-3 py-2 ${mode === "register" ? "bg-[#E0561E] text-white" : "text-gray-400"}`}>Регистрация</button></div>
    <h1 className="font-display mt-6 text-2xl font-bold">{mode === "login" ? "Вход в кабинет" : "Создать учётную запись"}</h1><p className="mt-2 text-sm text-gray-400">{mode === "login" ? "Управляйте заказами и статусом B2B-заявки." : "Пароль должен содержать не менее 12 символов."}</p>
    <form onSubmit={submit} className="mt-6 space-y-3">{mode === "register" && <><input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Имя" className="field"/><input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Телефон" className="field"/></>}<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="E-mail" className="field"/><input required minLength={mode === "register" ? 12 : 1} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Пароль" className="field"/>
      {mode === "register" && <><label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={form.segment === "b2b"} onChange={(e) => setForm({ ...form, segment: e.target.checked ? "b2b" : "b2c" })}/> Запросить B2B-доступ</label>{form.segment === "b2b" && <div className="grid gap-3"><input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Компания" className="field"/><input value={form.inn} onChange={(e) => setForm({ ...form, inn: e.target.value })} placeholder="ИНН" className="field"/></div>}</>}
      {error && <p className="text-sm text-red-400">{error}</p>}<button disabled={loading} className="w-full rounded-full bg-[#E0561E] px-5 py-3 text-sm font-semibold hover:bg-[#F26128] disabled:opacity-60">{loading ? "Подождите…" : mode === "login" ? "Войти" : "Зарегистрироваться"}</button>
    </form></div>;
}
