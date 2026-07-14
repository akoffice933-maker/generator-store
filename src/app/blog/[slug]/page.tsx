import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post] = await db.select({ title: blogPosts.title, excerpt: blogPosts.excerpt }).from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
  return post ? { title: `${post.title} — Generator Store`, description: post.excerpt } : {};
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
  if (!post) notFound();
  return <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
    <Link href="/blog" className="text-sm text-gray-400 hover:text-white">← Все материалы</Link>
    <article className="mt-6"><p className="text-xs font-semibold uppercase tracking-wide text-[#E0561E]">{post.category}</p><h1 className="font-display mt-3 text-3xl font-bold leading-tight sm:text-4xl">{post.title}</h1><p className="mt-4 text-sm text-gray-500">{formatDate(post.publishedAt)} · {post.readTimeMinutes} мин чтения</p>
      {post.coverImage && <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-3xl bg-[#15171c]"><Image src={post.coverImage} alt={post.title} fill priority className="object-cover" /></div>}
      <div className="mt-8 whitespace-pre-line text-base leading-8 text-gray-300">{post.content}</div>
      {post.tags.length > 0 && <div className="mt-8 flex flex-wrap gap-2">{post.tags.map((tag) => <span key={tag} className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">#{tag}</span>)}</div>}
    </article>
  </main>;
}
