import Image from "next/image";
import { CreditCard, Landmark, QrCode, Percent } from "lucide-react";
import DeliveryCalculator from "./DeliveryCalculator";

export const metadata = {
  title: "Доставка и оплата — Generator Store",
  description: "Условия доставки генераторов по России, калькулятор стоимости и сроков, способы оплаты для физлиц и юрлиц.",
};

export default function DeliveryPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Доставка и оплата</h1>
      <p className="mt-3 max-w-2xl text-gray-400">
        Доставляем генераторы по всей России собственным транспортом и транспортными компаниями. Рассчитайте
        предварительную стоимость и срок ниже.
      </p>

      <div className="mt-10">
        <DeliveryCalculator />
      </div>

      <section className="mt-16">
        <h2 className="font-display mb-6 text-2xl font-bold">Способы оплаты</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#111317] p-6">
            <QrCode size={22} className="mb-3 text-[#E0561E]" />
            <h3 className="font-display mb-1.5 font-semibold">СБП</h3>
            <p className="text-sm text-gray-400">Оплата по QR-коду через Систему быстрых платежей — скидка 1% на доставку.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#111317] p-6">
            <CreditCard size={22} className="mb-3 text-[#E0561E]" />
            <h3 className="font-display mb-1.5 font-semibold">Банковская карта</h3>
            <p className="text-sm text-gray-400">Visa, Mastercard, МИР через защищённый шлюз ЮKassa.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#111317] p-6">
            <Landmark size={22} className="mb-3 text-[#E0561E]" />
            <h3 className="font-display mb-1.5 font-semibold">Оплата по счёту</h3>
            <p className="text-sm text-gray-400">Безналичный расчёт с НДС 20% для юридических лиц и ИП, автоформирование счёта.</p>
          </div>
        </div>
      </section>

      <section className="mt-16 grid grid-cols-1 items-center gap-8 rounded-3xl border border-white/10 bg-[#111317] p-8 lg:grid-cols-[1fr_260px]">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[#E0561E]">
            <Percent size={18} />
            <span className="text-sm font-semibold uppercase tracking-wide">Демонстрация оплаты СБП</span>
          </div>
          <h3 className="font-display mb-2 text-xl font-bold">Отсканируйте QR-код для оплаты заказа</h3>
          <p className="text-sm text-gray-400">
            После оформления заказа с оплатой через СБП вы получите персональный QR-код для сканирования в приложении банка.
            Оплата подтверждается автоматически в течение нескольких секунд.
          </p>
        </div>
        <div className="flex items-center justify-center rounded-2xl bg-white p-4">
          <Image
            src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GeneratorStore-SBP-Demo"
            alt="Демо QR-код СБП"
            width={180}
            height={180}
            unoptimized
          />
        </div>
      </section>
    </main>
  );
}
