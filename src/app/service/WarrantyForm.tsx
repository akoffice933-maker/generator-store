"use client";

import { useState } from "react";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function WarrantyForm() {
  const [form, setForm] = useState({ fullName: "", phone: "", serialNumber: "", productName: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/warranty", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setExpiresAt(data.warranty.expiresAt);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <CheckCircle2 size={36} className="text-emerald-400" />
        <h3 className="font-display text-lg font-bold">Гарантия активирована</h3>
        <p className="text-sm text-gray-300">
          Расширенная гарантия до 5 лет зарегистрирована. Срок действия: {expiresAt ? formatDate(expiresAt) : ""}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-[#111317] p-6">
      <div className="mb-5 flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E0561E]/15 text-[#E0561E]">
          <ShieldCheck size={18} />
        </span>
        <h3 className="font-display text-xl font-bold">Регистрация электронной гарантии</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input
          required
          placeholder="ФИО"
          value={form.fullName}
          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          className="rounded-lg border border-white/10 bg-[#1b1d23] px-3 py-2.5 text-sm focus:outline-none"
        />
        <input
          required
          placeholder="Телефон"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="rounded-lg border border-white/10 bg-[#1b1d23] px-3 py-2.5 text-sm focus:outline-none"
        />
        <input
          required
          placeholder="Серийный номер"
          value={form.serialNumber}
          onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
          className="rounded-lg border border-white/10 bg-[#1b1d23] px-3 py-2.5 text-sm focus:outline-none"
        />
        <input
          placeholder="Модель генератора"
          value={form.productName}
          onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
          className="rounded-lg border border-white/10 bg-[#1b1d23] px-3 py-2.5 text-sm focus:outline-none"
        />
      </div>
      {status === "error" && <p className="mt-3 text-sm text-red-400">Проверьте правильность заполнения полей.</p>}
      <button
        disabled={status === "loading"}
        className="mt-5 rounded-full bg-[#E0561E] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#F26128] disabled:opacity-60"
      >
        {status === "loading" ? "Отправка..." : "Активировать гарантию"}
      </button>
    </form>
  );
}
