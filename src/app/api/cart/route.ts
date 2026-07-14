import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { cartItems } from "@/db/schema";
import { canUseWholesale, getSession } from "@/lib/auth";
import { addCartItem, getCartForUser } from "@/lib/cart";
import { readJsonBody, requireSameOrigin } from "@/lib/http";

const addSchema = z.object({ productId: z.number().int().positive(), qty: z.number().int().min(1).max(99).default(1) });

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const items = await getCartForUser(session.userId, canUseWholesale(session) ? "b2b" : "b2c");
  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req); if (originError) return originError;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await readJsonBody(req); if (!body.ok) return body.response;
  const parsed = addSchema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Некорректный товар" }, { status: 400 });
  const result = await addCartItem(session.userId, parsed.data.productId, parsed.data.qty);
  if (result.reason === "NOT_FOUND") return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
  if (result.reason === "OUT_OF_STOCK") return NextResponse.json({ error: "Товара нет в наличии" }, { status: 409 });
  const items = await getCartForUser(session.userId, canUseWholesale(session) ? "b2b" : "b2c");
  return NextResponse.json({ items }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const originError = requireSameOrigin(req); if (originError) return originError;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  await db.delete(cartItems).where(eq(cartItems.userId, session.userId));
  return NextResponse.json({ ok: true });
}
