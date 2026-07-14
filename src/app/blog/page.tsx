import Image from "next/image";
import Link from "next/link";
import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { desc } from "drizzle-orm";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Блог о генераторах — Generator Store", description: "Практические материалы о выборе, эксплуатации и обслуживании генераторов." };

export default async function BlogPage() {
  const posts = await db.select().from(blogPosts).orderBy(desc(blogPosts.publishedAt)).limit(50);
  return <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
    <span className="text-sm font-semibold uppercase tracking-wide text-[#E0561E]">Полезные материалы</span>
    <h1 className="font-display mt-2 text-3xl font-bold sm:text-4xl">Блог и обзоры</h1>
    <p className="mt-3 max-w-2xl text-gray-400">Рассказываем, как выбрать генератор, рассчитать нагрузку и обеспечить безопасную эксплуатацию.</p>
    <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => <Link key={post.id} href={`/blog/${post.slug}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#111317] transition hover:border-[#E0561E]/40">
        <div className="relative aspect-[16/10] bg-[#15171c]">{post.coverImage && <Image src={post.coverImage} alt={post.title} fill className="object-cover transition duration-500 group-hover:scale-105" />}</div>
        <article className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-[#E0561E]">{post.category}</p><h2 className="font-display mt-2 text-lg font-semibold">{post.title}</h2><p className="mt-2 line-clamp-3 text-sm text-gray-400">{post.excerpt}</p><p className="mt-4 text-xs text-gray-500">{formatDate(post.publishedAt)} · {post.readTimeMinutes} мин чтения</p></article>
      </Link>)}
    </div>
    {posts.length === 0 && <p className="mt-10 rounded-2xl border border-white/10 bg-[#111317] p-8 text-gray-400">Материалы скоро появятся.</p>}
  </main>;
}
