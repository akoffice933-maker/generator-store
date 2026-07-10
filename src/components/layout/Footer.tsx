import Link from "next/link";
import { Zap, Phone, Mail, MapPin, MessageCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#08090c]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#B23F12] to-[#FF6B35]">
              <Zap size={18} className="fill-white text-white" />
            </span>
            <span className="font-display text-lg font-bold">
              Generator<span className="text-[#E0561E]">Store</span>
            </span>
          </div>
          <p className="text-sm leading-relaxed text-gray-400">
            Силовые установки для дома и бизнеса: бензиновые, дизельные, газовые и инверторные генераторы.
            Розница и опт, гарантия до 5 лет.
          </p>
        </div>

        <div>
          <h4 className="font-display mb-4 text-sm font-semibold uppercase tracking-wide text-gray-300">Разделы</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link href="/catalog" className="hover:text-white">Каталог</Link></li>
            <li><Link href="/delivery" className="hover:text-white">Доставка и оплата</Link></li>
            <li><Link href="/service" className="hover:text-white">Гарантия и сервис</Link></li>
            <li><Link href="/blog" className="hover:text-white">Блог</Link></li>
            <li><Link href="/contacts" className="hover:text-white">Контакты</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display mb-4 text-sm font-semibold uppercase tracking-wide text-gray-300">Контакты</h4>
          <ul className="space-y-3 text-sm text-gray-400">
            <li className="flex items-center gap-2"><Phone size={14} className="text-[#E0561E]" /> +7 (862) 555-12-34</li>
            <li className="flex items-center gap-2"><Mail size={14} className="text-[#E0561E]" /> b2b@ita-sochi.ru</li>
            <li className="flex items-center gap-2"><MapPin size={14} className="text-[#E0561E]" /> г. Сочи, Голубые дали, 12</li>
            <li className="flex items-center gap-2"><MessageCircle size={14} className="text-[#E0561E]" /> Telegram / WhatsApp</li>
          </ul>
        </div>

        <div>
          <h4 className="font-display mb-4 text-sm font-semibold uppercase tracking-wide text-gray-300">Документы</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link href="/legal/privacy" className="hover:text-white">Политика конфиденциальности</Link></li>
            <li><Link href="/legal/offer" className="hover:text-white">Пользовательское соглашение</Link></li>
            <li><Link href="/admin" className="hover:text-white">Вход для сотрудников</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 px-4 py-6 text-center text-xs text-gray-500 sm:px-6 lg:px-8">
        © {new Date().getFullYear()} ООО «ИТА» — Generator Store. Информация на сайте не является публичной офертой (ст. 437 ГК РФ).
      </div>
    </footer>
  );
}
