import { db } from "@/db";
import { products, brands, categories, reviews } from "@/db/schema";
import { and, asc, desc, eq, gte, lte, sql, ilike, or } from "drizzle-orm";

export type ProductFilters = {
  search?: string;
  type?: string;
  brandSlug?: string;
  categorySlug?: string;
  minPower?: number;
  maxPower?: number;
  phases?: number;
  inStockOnly?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
};

export async function getProducts(filters: ProductFilters) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 12;

  const conditions = [];

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(or(ilike(products.name, term), ilike(products.description, term)));
  }
  if (filters.type && filters.type !== "all") {
    conditions.push(eq(products.type, filters.type as "gasoline" | "diesel" | "gas" | "inverter"));
  }
  if (filters.minPower !== undefined) {
    conditions.push(gte(products.powerKw, filters.minPower.toString()));
  }
  if (filters.maxPower !== undefined) {
    conditions.push(lte(products.powerKw, filters.maxPower.toString()));
  }
  if (filters.phases) {
    conditions.push(eq(products.phases, filters.phases));
  }
  if (filters.inStockOnly) {
    conditions.push(gte(products.stock, 1));
  }

  let brandId: number | undefined;
  if (filters.brandSlug) {
    const brand = await db.select().from(brands).where(eq(brands.slug, filters.brandSlug)).limit(1);
    brandId = brand[0]?.id;
    conditions.push(brandId ? eq(products.brandId, brandId) : sql`false`);
  }

  let categoryId: number | undefined;
  if (filters.categorySlug) {
    const category = await db.select().from(categories).where(eq(categories.slug, filters.categorySlug)).limit(1);
    categoryId = category[0]?.id;
    conditions.push(categoryId ? eq(products.categoryId, categoryId) : sql`false`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let orderBy = desc(products.featured);
  switch (filters.sort) {
    case "price_asc":
      orderBy = asc(products.priceRetail);
      break;
    case "price_desc":
      orderBy = desc(products.priceRetail);
      break;
    case "power":
      orderBy = desc(products.powerKw);
      break;
    default:
      orderBy = desc(products.featured);
  }

  const baseQuery = db
    .select({
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
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(categories, eq(products.categoryId, categories.id));

  const filteredQuery = whereClause ? baseQuery.where(whereClause) : baseQuery;

  const rows = await filteredQuery
    .orderBy(orderBy, desc(products.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const countQuery = db.select({ count: sql<number>`count(*)::int` }).from(products);
  const countResult = whereClause ? await countQuery.where(whereClause) : await countQuery;
  const total = countResult[0]?.count ?? 0;

  return { items: rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getProductBySlug(slug: string) {
  const rows = await db
    .select({
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
      description: products.description,
      videoUrl: products.videoUrl,
      documents: products.documents,
      rating: products.rating,
      reviewsCount: products.reviewsCount,
      featured: products.featured,
      brandId: products.brandId,
      categoryId: products.categoryId,
      brandName: brands.name,
      brandSlug: brands.slug,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.slug, slug))
    .limit(1);

  const product = rows[0];
  if (!product) return null;

  const productReviews = await db
    .select()
    .from(reviews)
    .where(eq(reviews.productId, product.id))
    .orderBy(desc(reviews.createdAt));

  const related = await db
    .select({
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
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(product.categoryId ? eq(products.categoryId, product.categoryId) : sql`false`)
    .limit(5);

  return {
    product,
    reviews: productReviews,
    related: related.filter((p) => p.id !== product.id).slice(0, 4),
  };
}

export type ProductListItem = Awaited<ReturnType<typeof getProducts>>["items"][number];
