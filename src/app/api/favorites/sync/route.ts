import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { favorites, products } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { readJsonBody, requireSameOrigin } from "@/lib/http";

const schema = z.object({ productIds: z.array(z.number().int().positive()).max(100) });

/** Merges guest-browser favorites into the authenticated user's server list. */
export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req); if (originError) return originError;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await readJsonBody(req); if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Некорректные товары" }, { status: 400 });

  const productIds = [...new Set(parsed.data.productIds)];
  if (productIds.length) {
    const existing = await db.select({ id: products.id }).from(products).where(inArray(products.id, productIds));
    if (existing.length) await db.insert(favorites).values(existing.map((product) => ({ userId: session.userId, productId: product.id }))).onConflictDoNothing();
  }
  const all = await db.select({ productId: favorites.productId }).from(favorites).where(eq(favorites.userId, session.userId));
  return NextResponse.json({ items: all.map((item) => item.productId) });
}
