import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import ContactForm from "./ContactForm";

export const metadata = { title: "Контакты — Generator Store", description: "Свяжитесь с Generator Store по вопросу подбора генератора, доставки, сервиса или B2B-заказа." };

export default function ContactsPage() {
  return <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><span className="text-sm font-semibold uppercase tracking-wide text-[#E0561E]">Связь с командой</span><h1 className="font-display mt-2 text-3xl font-bold sm:text-4xl">Контакты</h1><p className="mt-3 max-w-2xl text-gray-400">Оставьте заявку — специалист уточнит детали и предложит следующий шаг. Перед запуском заполните здесь фактические реквизиты и каналы связи компании.</p>
    <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[0.8fr_1.2fr]"><section className="space-y-4">{[
      { icon: Phone, title: "Телефон", text: "Добавьте рабочий номер перед публикацией" },
      { icon: Mail, title: "E-mail", text: "Добавьте рабочий адрес перед публикацией" },
      { icon: MapPin, title: "Адрес", text: "Укажите юридический и сервисный адрес" },
      { icon: Clock3, title: "Режим работы", text: "Укажите часы обработки обращений" },
    ].map((item) => <div key={item.title} className="flex gap-4 rounded-2xl border border-white/10 bg-[#111317] p-5"><item.icon size={20} className="mt-0.5 shrink-0 text-[#E0561E]"/><div><h2 className="font-display font-semibold">{item.title}</h2><p className="mt-1 text-sm text-gray-400">{item.text}</p></div></div>)}</section><ContactForm /></div>
  </main>;
}
