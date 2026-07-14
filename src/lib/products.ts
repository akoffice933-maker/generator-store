import { db } from "@/db";
import { products, brands, categories, reviews } from "@/db/schema";
import { and, asc, desc, eq, gte, lte, sql, ilike, or } from "drizzle-orm";

export type PricingTier = "b2c" | "b2b";

export type ProductFilters = {
  search?: string;
  type?: "gasoline" | "diesel" | "gas" | "inverter";
  brandSlug?: string;
  categorySlug?: string;
  minPower?: number;
  maxPower?: number;
  phases?: number;
  inStockOnly?: boolean;
  sort?: "price_asc" | "price_desc" | "power" | "popular";
  page?: number;
  pageSize?: number;
};

const MAX_PAGE_SIZE = 48;

const productSelection = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  type: products.type,
  powerKw: products.powerKw,
  phases: products.phases,
  startType: products.startType,
  tankL: products.tankL,
  fuelConsumption: products.fuelConsumption,
  weightKg: products.weightKg,
  noiseDb: products.noiseDb,
  priceRetail: products.priceRetail,
  priceWholesale: products.priceWholesale,
  stock: products.stock,
  images: products.images,
  rating: products.rating,
  reviewsCount: products.reviewsCount,
  featured: products.featured,
  brandName: brands.name,
  brandSlug: brands.slug,
  categoryName: categories.name,
  categorySlug: categories.slug,
};

type ProductRow = typeof productSelection;

type SelectedProduct = {
  [K in keyof ProductRow]: ProductRow[K] extends { _: { data: infer T } } ? T : never;
};

function exposePrice<T extends { priceWholesale: string; priceRetail: string }>(product: T, pricingTier: PricingTier) {
  return {
    ...product,
    // Wholesale price must never reach an anonymous/customer browser.
    priceWholesale: pricingTier === "b2b" ? product.priceWholesale : null,
  };
}

function safePage(value: number | undefined) {
  return Number.isSafeInteger(value) && value && value > 0 ? value : 1;
}

function safePageSize(value: number | undefined) {
  return Number.isSafeInteger(value) && value && value > 0 ? Math.min(value, MAX_PAGE_SIZE) : 12;
}

export async function getProducts(filters: ProductFilters, pricingTier: PricingTier = "b2c") {
  const page = safePage(filters.page);
  const pageSize = safePageSize(filters.pageSize);
  const conditions = [];

  if (filters.search) {
    const normalized = filters.search.trim().slice(0, 100);
    if (normalized) {
      const term = `%${normalized.replace(/[\\%_]/g, "\\$&")}%`;
      conditions.push(or(ilike(products.name, term), ilike(products.description, term)));
    }
  }
  if (filters.type) conditions.push(eq(products.type, filters.type));
  if (filters.minPower !== undefined && Number.isFinite(filters.minPower)) {
    conditions.push(gte(products.powerKw, filters.minPower.toString()));
  }
  if (filters.maxPower !== undefined && Number.isFinite(filters.maxPower)) {
    conditions.push(lte(products.powerKw, filters.maxPower.toString()));
  }
  if (filters.phases && Number.isInteger(filters.phases) && filters.phases >= 1 && filters.phases <= 3) {
    conditions.push(eq(products.phases, filters.phases));
  }
  if (filters.inStockOnly) conditions.push(gte(products.stock, 1));

  if (filters.brandSlug) {
    const [brand] = await db.select({ id: brands.id }).from(brands).where(eq(brands.slug, filters.brandSlug)).limit(1);
    conditions.push(brand ? eq(products.brandId, brand.id) : sql`false`);
  }

  if (filters.categorySlug) {
    const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, filters.categorySlug)).limit(1);
    conditions.push(category ? eq(products.categoryId, category.id) : sql`false`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  let orderBy = desc(products.featured);
  switch (filters.sort) {
    case "price_asc": orderBy = asc(products.priceRetail); break;
    case "price_desc": orderBy = desc(products.priceRetail); break;
    case "power": orderBy = desc(products.powerKw); break;
    default: orderBy = desc(products.featured);
  }

  const baseQuery = db
    .select(productSelection)
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(categories, eq(products.categoryId, categories.id));
  const filteredQuery = whereClause ? baseQuery.where(whereClause) : baseQuery;

  const [rows, countResult] = await Promise.all([
    filteredQuery.orderBy(orderBy, desc(products.id)).limit(pageSize).offset((page - 1) * pageSize),
    whereClause
      ? db.select({ count: sql<number>`count(*)::int` }).from(products).where(whereClause)
      : db.select({ count: sql<number>`count(*)::int` }).from(products),
  ]);

  const total = countResult[0]?.count ?? 0;
  return {
    items: rows.map((row) => exposePrice(row, pricingTier)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getProductBySlug(slug: string, pricingTier: PricingTier = "b2c") {
  const rows = await db
    .select({
      ...productSelection,
      description: products.description,
      videoUrl: products.videoUrl,
      documents: products.documents,
      brandId: products.brandId,
      categoryId: products.categoryId,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.slug, slug))
    .limit(1);

  const rawProduct = rows[0];
  if (!rawProduct) return null;

  const [productReviews, related] = await Promise.all([
    db.select().from(reviews).where(eq(reviews.productId, rawProduct.id)).orderBy(desc(reviews.createdAt)),
    rawProduct.categoryId
      ? db
          .select(productSelection)
          .from(products)
          .leftJoin(brands, eq(products.brandId, brands.id))
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .where(eq(products.categoryId, rawProduct.categoryId))
          .orderBy(desc(products.featured), desc(products.id))
          .limit(5)
      : Promise.resolve([]),
  ]);

  return {
    product: exposePrice(rawProduct, pricingTier),
    reviews: productReviews,
    related: related.filter((p) => p.id !== rawProduct.id).slice(0, 4).map((p) => exposePrice(p, pricingTier)),
  };
}

export type ProductListItem = Awaited<ReturnType<typeof getProducts>>["items"][number];
