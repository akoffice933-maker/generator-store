import { ShieldCheck, Wrench, ClipboardCheck } from "lucide-react";
import DiagnosticsWizard from "./DiagnosticsWizard";
import WarrantyForm from "./WarrantyForm";

export const metadata = {
  title: "Гарантия и сервис — Generator Store",
  description: "Регистрация гарантии, экспресс-диагностика и заявка на сервисное обслуживание генератора.",
};

export default function ServicePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <span className="text-sm font-semibold uppercase tracking-wide text-[#E0561E]">Поддержка после покупки</span>
      <h1 className="font-display mt-2 text-3xl font-bold sm:text-4xl">Гарантия и сервис</h1>
      <p className="mt-3 max-w-2xl text-gray-400">Поможем зарегистрировать гарантию, разобраться с типовой неисправностью или оставить заявку на выезд специалиста.</p>
      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { icon: ShieldCheck, title: "Электронная гарантия", text: "Сохраняем данные регистрации и дату окончания гарантийного периода." },
          { icon: Wrench, title: "Диагностика", text: "Проверьте безопасные базовые причины неисправности до обращения в сервис." },
          { icon: ClipboardCheck, title: "Заявка мастеру", text: "Оставьте контакты — сервисная команда уточнит модель и согласует следующий шаг." },
        ].map((item) => <div key={item.title} className="rounded-2xl border border-white/10 bg-[#111317] p-5"><item.icon size={22} className="mb-3 text-[#E0561E]" /><h2 className="font-display font-semibold">{item.title}</h2><p className="mt-2 text-sm leading-relaxed text-gray-400">{item.text}</p></div>)}
      </div>
      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <WarrantyForm />
        <DiagnosticsWizard />
      </div>
    </main>
  );
}
