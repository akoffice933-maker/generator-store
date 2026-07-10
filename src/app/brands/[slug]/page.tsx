import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rows = await db.select().from(brands).where(eq(brands.slug, slug)).limit(1);
  const brand = rows[0];
  if (!brand) return {};
  return { title: `Генераторы ${brand.name} — купить в Generator Store` };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rows = await db.select().from(brands).where(eq(brands.slug, slug)).limit(1);
  const brand = rows[0];
  if (!brand) notFound();

  const { items, total } = await getProducts({ brandSlug: slug, pageSize: 24 });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/catalog" className="hover:text-white">Каталог</Link> / <span className="text-gray-300">{brand.name}</span>
      </nav>
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Генераторы {brand.name}</h1>
      <p className="mt-2 text-sm text-gray-500">Найдено моделей: {total}</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </main>
  );
}
