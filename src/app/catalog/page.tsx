import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { getProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import CatalogFilters from "./CatalogFilters";
import CompareBar from "@/components/CompareBar";
import { PackageSearch } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Каталог генераторов — Generator Store",
  description: "Бензиновые, дизельные, газовые и инверторные генераторы. Розница и опт, фильтры по мощности, фазности и наличию.",
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const brandList = await db.select().from(brands);

  const { items, total, page, totalPages } = await getProducts({
    search: sp.search,
    type: sp.type,
    brandSlug: sp.brand,
    minPower: sp.minPower ? Number(sp.minPower) : undefined,
    maxPower: sp.maxPower ? Number(sp.maxPower) : undefined,
    phases: sp.phases ? Number(sp.phases) : undefined,
    inStockOnly: sp.inStock === "1",
    sort: sp.sort,
    page: sp.page ? Number(sp.page) : 1,
  });

  const buildPageHref = (p: number) => {
    const params = new URLSearchParams(sp as Record<string, string>);
    params.set("page", String(p));
    return `/catalog?${params.toString()}`;
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Каталог генераторов</h1>
        <p className="mt-2 text-gray-400">Найдено моделей: {total}</p>
      </div>

      <Suspense>
        <CatalogFilters brands={brandList} />
      </Suspense>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-[#111317] py-20 text-center">
          <PackageSearch size={48} className="text-gray-600" />
          <p className="text-lg font-semibold">Ничего не найдено</p>
          <p className="max-w-sm text-sm text-gray-400">Попробуйте изменить параметры фильтра или сбросить их полностью.</p>
          <Link href="/catalog" className="rounded-full bg-[#E0561E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#F26128]">
            Сбросить все фильтры
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={buildPageHref(p)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    p === page ? "bg-[#E0561E] text-white" : "bg-[#111317] text-gray-300 hover:text-white"
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      <CompareBar />
    </main>
  );
}
