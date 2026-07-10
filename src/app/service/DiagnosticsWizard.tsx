"use client";

import { useEffect, useState } from "react";
import { Wrench, ChevronRight, PhoneCall, CheckCircle2 } from "lucide-react";

type Symptom = { id: number; title: string; description: string; steps: string[] };

export default function DiagnosticsWizard() {
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [selected, setSelected] = useState<Symptom | null>(null);
  const [callForm, setCallForm] = useState({ name: "", phone: "" });
  const [callStatus, setCallStatus] = useState<"idle" | "loading" | "done">("idle");

  useEffect(() => {
    fetch("/api/diagnostics")
      .then((res) => res.json())
      .then((data) => setSymptoms(data.items || []));
  }, []);

  async function requestMaster(e: React.FormEvent) {
    e.preventDefault();
    setCallStatus("loading");
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "master_call",
        name: callForm.name,
        phone: callForm.phone,
        comment: selected ? `Диагностика: ${selected.title}` : "Вызов мастера",
      }),
    });
    setCallStatus("done");
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111317] p-6">
      <div className="mb-5 flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E0561E]/15 text-[#E0561E]">
          <Wrench size={18} />
        </span>
        <h3 className="font-display text-xl font-bold">Экспресс-диагностика неисправностей</h3>
      </div>

      {!selected ? (
        <div className="space-y-2">
          <p className="mb-3 text-sm text-gray-400">Выберите симптом неисправности:</p>
          {symptoms.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#1b1d23] px-4 py-3 text-left text-sm font-medium transition-colors hover:border-[#E0561E]/40"
            >
              {s.title}
              <ChevronRight size={16} className="text-gray-500" />
            </button>
          ))}
        </div>
      ) : (
        <div>
          <button onClick={() => setSelected(null)} className="mb-4 text-sm text-gray-400 hover:text-white">
            ← Выбрать другой симптом
          </button>
          <h4 className="font-display mb-1 font-semibold">{selected.title}</h4>
          <p className="mb-4 text-sm text-gray-400">{selected.description}</p>
          <ol className="space-y-2">
            {selected.steps.map((step, i) => (
              <li key={i} className="flex gap-3 rounded-lg bg-[#1b1d23] p-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E0561E] text-xs font-bold text-white">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          <div className="mt-6 rounded-xl border border-white/10 bg-[#15171c] p-4">
            {callStatus === "done" ? (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={18} /> Заявка на вызов мастера принята, менеджер свяжется с вами.
              </div>
            ) : (
              <form onSubmit={requestMaster} className="flex flex-col gap-3 sm:flex-row">
                <input
                  required
                  placeholder="Ваше имя"
                  value={callForm.name}
                  onChange={(e) => setCallForm((f) => ({ ...f, name: e.target.value }))}
                  className="flex-1 rounded-lg border border-white/10 bg-[#1b1d23] px-3 py-2.5 text-sm focus:outline-none"
                />
                <input
                  required
                  placeholder="Телефон"
                  value={callForm.phone}
                  onChange={(e) => setCallForm((f) => ({ ...f, phone: e.target.value }))}
                  className="flex-1 rounded-lg border border-white/10 bg-[#1b1d23] px-3 py-2.5 text-sm focus:outline-none"
                />
                <button className="flex items-center justify-center gap-2 rounded-full bg-[#E0561E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#F26128]">
                  <PhoneCall size={15} /> Вызвать мастера
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
