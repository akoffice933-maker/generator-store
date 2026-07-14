import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { favorites, products } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { readJsonBody, requireSameOrigin } from "@/lib/http";

const schema = z.object({ productId: z.number().int().positive() });

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ items: [] }, { headers: { "Cache-Control": "no-store" } });
  const items = await db.select({ productId: favorites.productId }).from(favorites).where(eq(favorites.userId, session.userId));
  return NextResponse.json({ items: items.map((item) => item.productId) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req); if (originError) return originError;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await readJsonBody(req); if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Некорректный товар" }, { status: 400 });

  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, parsed.data.productId)).limit(1);
  if (!product) return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
  await db.insert(favorites).values({ userId: session.userId, productId: product.id }).onConflictDoNothing();
  return NextResponse.json({ ok: true }, { status: 201 });
}
