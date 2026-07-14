"use client";

import { useState } from "react";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", comment: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");
    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, type: "contact" }) });
      if (!response.ok) throw new Error("Lead request failed");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") return <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-emerald-300">Спасибо! Заявка принята — менеджер свяжется с вами по указанным контактам.</div>;
  return <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-[#111317] p-6">
    <h2 className="font-display text-xl font-bold">Оставить заявку</h2><p className="mt-2 text-sm text-gray-400">Опишите задачу — подбор, доставка, сервис или B2B-запрос.</p>
    <div className="mt-5 grid gap-3"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Имя" className="rounded-lg border border-white/10 bg-[#1b1d23] px-3 py-2.5 text-sm outline-none focus:border-[#E0561E]" />
      <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Телефон" className="rounded-lg border border-white/10 bg-[#1b1d23] px-3 py-2.5 text-sm outline-none focus:border-[#E0561E]" />
      <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="E-mail (необязательно)" className="rounded-lg border border-white/10 bg-[#1b1d23] px-3 py-2.5 text-sm outline-none focus:border-[#E0561E]" />
      <textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="Чем помочь?" rows={4} className="rounded-lg border border-white/10 bg-[#1b1d23] px-3 py-2.5 text-sm outline-none focus:border-[#E0561E]" />
    </div>{status === "error" && <p className="mt-3 text-sm text-red-400">Не удалось отправить заявку. Проверьте данные и повторите позже.</p>}
    <button disabled={status === "sending"} className="mt-5 rounded-full bg-[#E0561E] px-5 py-3 text-sm font-semibold hover:bg-[#F26128] disabled:opacity-60">{status === "sending" ? "Отправка…" : "Отправить заявку"}</button>
  </form>;
}
