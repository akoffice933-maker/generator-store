export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/products";
import { getCurrentPricingTier } from "@/lib/pricing";
import ProductActions from "./ProductActions";
import ProductCard from "@/components/ProductCard";
import { formatDate, startTypeLabels, typeLabels } from "@/lib/format";
import { FileText, Star } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getProductBySlug(slug);
  if (!data) return {};
  return {
    title: `${data.product.name} — купить в Generator Store`,
    description: data.product.description.slice(0, 155),
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pricingTier = await getCurrentPricingTier();
  const data = await getProductBySlug(slug, pricingTier);
  if (!data) notFound();

  const { product, reviews, related } = data;
  const image = product.images?.[0] || "/images/gen-gasoline-1.jpg";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image,
    description: product.description,
    brand: product.brandName || undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: product.priceWholesale ?? product.priceRetail,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    aggregateRating:
      product.reviewsCount > 0
        ? { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviewsCount }
        : undefined,
  };

  const specs = [
    { label: "Тип", value: typeLabels[product.type] },
    { label: "Мощность", value: `${product.powerKw} кВт` },
    { label: "Фазность", value: `${product.phases} фаза(ы)` },
    { label: "Запуск", value: startTypeLabels[product.startType] },
    { label: "Топливный бак", value: product.tankL ? `${product.tankL} л` : "—" },
    { label: "Расход топлива", value: product.fuelConsumption ? `${product.fuelConsumption} л/ч` : "—" },
    { label: "Вес", value: product.weightKg ? `${product.weightKg} кг` : "—" },
    { label: "Уровень шума", value: product.noiseDb ? `${product.noiseDb} дБ` : "—" },
    { label: "Бренд", value: product.brandName || "—" },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
        <Link href="/catalog" className="hover:text-white">Каталог</Link>
        <span>/</span>
        {product.categoryName && (
          <>
            <Link href={`/categories/${product.categorySlug}`} className="hover:text-white">{product.categoryName}</Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-300">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-[#111317]">
            <Image src={image} alt={product.name} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
          </div>
        </div>

        <div>
          {product.brandName && <p className="text-sm font-semibold uppercase tracking-wide text-[#E0561E]">{product.brandName}</p>}
          <h1 className="font-display mt-1 text-2xl font-bold sm:text-3xl">{product.name}</h1>
          {product.reviewsCount > 0 && (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
              <div className="flex items-center gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} fill={i < Math.round(Number(product.rating)) ? "currentColor" : "none"} />
                ))}
              </div>
              {product.rating} ({product.reviewsCount} отзывов)
            </div>
          )}

          <p className="mt-4 text-sm leading-relaxed text-gray-300">{product.description}</p>

          <div className="mt-6">
            <ProductActions
              productId={product.id}
              slug={product.slug}
              name={product.name}
              image={image}
              priceRetail={Number(product.priceRetail)}
              priceWholesale={product.priceWholesale ? Number(product.priceWholesale) : null}
              stock={product.stock}
            />
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-[#111317] p-5 sm:grid-cols-3">
            {specs.map((spec) => (
              <div key={spec.label}>
                <p className="text-xs text-gray-500">{spec.label}</p>
                <p className="text-sm font-semibold">{spec.value}</p>
              </div>
            ))}
          </div>

          {product.documents && product.documents.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold text-gray-300">Документы</p>
              <div className="flex flex-wrap gap-2">
                {product.documents.map((doc) => (
                  <a
                    key={doc.title}
                    href={doc.url}
                    className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:text-white"
                  >
                    <FileText size={13} /> {doc.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="mt-16">
        <h2 className="font-display mb-5 text-xl font-bold">Отзывы покупателей</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400">Пока нет отзывов на эту модель.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-2xl border border-white/10 bg-[#111317] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold">{review.authorName}</p>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-300">{review.text}</p>
                <p className="mt-2 text-xs text-gray-500">{formatDate(review.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display mb-5 text-xl font-bold">Похожие товары</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
