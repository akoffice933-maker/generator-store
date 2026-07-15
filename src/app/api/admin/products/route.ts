import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, brands, categories } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireStaff } from "@/lib/requireRole";
import { z } from "zod";
import { requireSameOrigin } from "@/lib/http";
import { writeAuditLog } from "@/lib/audit";

const productSchema = z.object({
  slug: z.string().min(2),
  name: z.string().min(2),
  brandId: z.number().nullable().optional(),
  categoryId: z.number().nullable().optional(),
  type: z.enum(["gasoline", "diesel", "gas", "inverter"]),
  powerKw: z.number().min(0.1),
  phases: z.number().int().min(1).max(3),
  startType: z.enum(["manual", "electric", "avr"]),
  tankL: z.number().nullable().optional(),
  fuelConsumption: z.number().nullable().optional(),
  weightKg: z.number().nullable().optional(),
  noiseDb: z.number().nullable().optional(),
  priceRetail: z.number().min(0),
  priceWholesale: z.number().min(0),
  stock: z.number().int().min(0),
  images: z.array(z.string()).default([]),
  description: z.string().default(""),
  featured: z.boolean().default(false),
});

export async function GET() {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      brandId: products.brandId,
      categoryId: products.categoryId,
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
      featured: products.featured,
      brandName: brands.name,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(desc(products.id)).limit(200);

  const brandList = await db.select().from(brands);
  const categoryList = await db.select().from(categories);

  return NextResponse.json({ items: rows, brands: brandList, categories: categoryList });
}

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req);
  if (originError) return originError;
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Некорректные данные" }, { status: 400 });
  }
  const data = parsed.data;

  const [product] = await db
    .insert(products)
    .values({
      slug: data.slug,
      name: data.name,
      brandId: data.brandId ?? null,
      categoryId: data.categoryId ?? null,
      type: data.type,
      powerKw: data.powerKw.toString(),
      phases: data.phases,
      startType: data.startType,
      tankL: data.tankL != null ? data.tankL.toString() : null,
      fuelConsumption: data.fuelConsumption != null ? data.fuelConsumption.toString() : null,
      weightKg: data.weightKg != null ? data.weightKg.toString() : null,
      noiseDb: data.noiseDb != null ? data.noiseDb.toString() : null,
      priceRetail: data.priceRetail.toString(),
      priceWholesale: data.priceWholesale.toString(),
      stock: data.stock,
      images: data.images,
      description: data.description,
      featured: data.featured,
    })
    .returning();

  await writeAuditLog(session, { action: "product.create", entityType: "product", entityId: product.id, metadata: { fields: ["slug", "name", "brandId", "categoryId", "type", "prices", "stock", "featured"] } });
  return NextResponse.json({ product });
}
