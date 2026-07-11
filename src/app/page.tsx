export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShieldCheck, Truck, Wrench, BadgePercent, Star } from "lucide-react";
import { getProducts } from "@/lib/products";
import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { desc } from "drizzle-orm";
import ProductCard from "@/components/ProductCard";
import PowerCalculator from "@/components/home/PowerCalculator";
import { formatDate } from "@/lib/format";

export default async function HomePage() {
  const { items: featured } = await getProducts({ pageSize: 8, sort: "popular" });
  const posts = await db.select().from(blogPosts).orderBy(desc(blogPosts.publishedAt)).limit(3);

  return (
    <main>
      <section id="hero" className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0">
          <Image src="/images/hero-bg.jpg" alt="Generator Store" fill priority className="object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0b0d]/40 via-[#0a0b0d]/70 to-[#0a0b0d]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <span className="mb-5 inline-block rounded-full border border-[#E0561E]/40 bg-[#E0561E]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#E0561E]">
            Розница и опт · Гарантия до 5 лет
          </span>
          <h1 className="font-display max-w-2xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Электричество там, где оно нужно — <span className="text-[#E0561E]">без перебоев</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-gray-300">
            Бензиновые, дизельные, газовые и инверторные генераторы для дома и бизнеса. Подберём мощность,
            доставим по России и подключим с гарантией.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/catalog" className="flex items-center gap-2 rounded-full bg-[#E0561E] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#F26128]">
              Перейти в каталог <ArrowRight size={16} />
            </Link>
            <a href="#calculator" className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10">
              Подобрать мощность
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, title: "Гарантия до 5 лет", desc: "Официальная гарантия и регистрация электронного талона" },
            { icon: Wrench, title: "Сервис и ПНР", desc: "Пусконаладка и обслуживание в вашем регионе" },
            { icon: Truck, title: "Доставка по РФ", desc: "От 1 дня по городу, расчёт стоимости онлайн" },
            { icon: BadgePercent, title: "Опт для B2B", desc: "Специальные цены и счета с НДС для юрлиц" },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-[#111317] p-6">
              <item.icon size={22} className="mb-3 text-[#E0561E]" />
              <h3 className="font-display font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-sm text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="calculator" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <PowerCalculator />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Популярные модели</h2>
          <Link href="/catalog" className="flex items-center gap-1 text-sm font-semibold text-[#E0561E] hover:text-[#F26128]">
            Весь каталог <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="border-y border-white/5 bg-[#08090c] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Блог и обзоры</h2>
            <Link href="/blog" className="flex items-center gap-1 text-sm font-semibold text-[#E0561E] hover:text-[#F26128]">
              Все статьи <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#111317]">
                <div className="relative aspect-[16/10] overflow-hidden">
                  {post.coverImage && (
                    <Image src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  )}
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#E0561E]">{post.category}</p>
                  <h3 className="font-display mt-2 line-clamp-2 font-semibold group-hover:text-[#E0561E]">{post.title}</h3>
                  <p className="mt-2 text-xs text-gray-500">{formatDate(post.publishedAt)} · {post.readTimeMinutes} мин чтения</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 rounded-3xl border border-[#E0561E]/30 bg-gradient-to-br from-[#E0561E]/15 to-transparent p-10 text-center">
          <div className="flex items-center gap-1 text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={16} fill="currentColor" />
            ))}
          </div>
          <h2 className="font-display max-w-xl text-2xl font-bold sm:text-3xl">Нужна помощь с подбором генератора?</h2>
          <p className="max-w-lg text-gray-300">Оставьте заявку — наш инженер подберёт оптимальную модель под ваши задачи и рассчитает стоимость с доставкой.</p>
          <Link href="/contacts" className="rounded-full bg-[#E0561E] px-6 py-3 text-sm font-semibold text-white hover:bg-[#F26128]">
            Получить консультацию
          </Link>
        </div>
      </section>
    </main>
  );
}
