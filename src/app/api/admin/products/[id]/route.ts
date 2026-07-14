import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/requireRole";
import { z } from "zod";
import { parsePositiveInt, readJsonBody, requireSameOrigin } from "@/lib/http";

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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(req);
  if (originError) return originError;
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const productId = parsePositiveInt(id);
  if (!productId) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const parsed = productSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Некорректные данные" }, { status: 400 });
  }
  const data = parsed.data;

  const [product] = await db
    .update(products)
    .set({
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
    .where(eq(products.id, productId))
    .returning();

  if (!product) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(req);
  if (originError) return originError;
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const productId = parsePositiveInt(id);
  if (!productId) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  const [deleted] = await db.delete(products).where(eq(products.id, productId)).returning({ id: products.id });
  if (!deleted) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
