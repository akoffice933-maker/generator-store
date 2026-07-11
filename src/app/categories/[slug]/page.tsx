export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rows = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  const category = rows[0];
  if (!category) return {};
  return { title: `${category.name} — купить в Generator Store`, description: category.description || undefined };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rows = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  const category = rows[0];
  if (!category) notFound();

  const { items, total } = await getProducts({ categorySlug: slug, pageSize: 24 });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/catalog" className="hover:text-white">Каталог</Link> / <span className="text-gray-300">{category.name}</span>
      </nav>
      <h1 className="font-display text-3xl font-bold sm:text-4xl">{category.name}</h1>
      {category.description && <p className="mt-3 max-w-2xl text-gray-400">{category.description}</p>}
      <p className="mt-2 text-sm text-gray-500">Найдено моделей: {total}</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </main>
  );
}
