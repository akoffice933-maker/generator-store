import { and, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { cartItems, products } from "@/db/schema";
import { canUseWholesale, getSession } from "@/lib/auth";
import { getCartForUser } from "@/lib/cart";
import { readJsonBody, requireSameOrigin } from "@/lib/http";

const schema = z.object({ items: z.array(z.object({ productId: z.number().int().positive(), qty: z.number().int().min(1).max(99) })).max(50) });

/** Merge a guest cart on first authenticated visit; existing server quantities are never silently discarded. */
export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req); if (originError) return originError;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await readJsonBody(req); if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Некорректная корзина" }, { status: 400 });

  const requested = new Map<number, number>();
  for (const item of parsed.data.items) requested.set(item.productId, Math.max(requested.get(item.productId) ?? 0, item.qty));
  const ids = [...requested.keys()];
  if (ids.length) {
    const available = await db.select({ id: products.id, stock: products.stock }).from(products).where(inArray(products.id, ids));
    await db.transaction(async (tx) => {
      for (const product of available) {
        if (product.stock < 1) continue;
        const [existing] = await tx.select({ id: cartItems.id, qty: cartItems.qty }).from(cartItems).where(and(eq(cartItems.userId, session.userId), eq(cartItems.productId, product.id))).limit(1);
        const qty = Math.min(product.stock, Math.max(existing?.qty ?? 0, requested.get(product.id) ?? 0));
        if (existing) await tx.update(cartItems).set({ qty, updatedAt: new Date() }).where(eq(cartItems.id, existing.id));
        else await tx.insert(cartItems).values({ userId: session.userId, productId: product.id, qty });
      }
    });
  }
  const items = await getCartForUser(session.userId, canUseWholesale(session) ? "b2b" : "b2c");
  return NextResponse.json({ items });
}
