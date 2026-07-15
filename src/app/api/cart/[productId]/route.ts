import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { cartItems } from "@/db/schema";
import { canUseWholesale, getSession } from "@/lib/auth";
import { getCartForUser, setCartItemQuantity } from "@/lib/cart";
import { parsePositiveInt, readJsonBody, requireSameOrigin } from "@/lib/http";

const schema = z.object({ qty: z.number().int().min(1).max(99) });

export async function PUT(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const originError = requireSameOrigin(req); if (originError) return originError;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const productId = parsePositiveInt((await params).productId);
  if (!productId) return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
  const body = await readJsonBody(req); if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Некорректное количество" }, { status: 400 });
  const result = await setCartItemQuantity(session.userId, productId, parsed.data.qty);
  if (result.reason === "NOT_FOUND") return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
  if (result.reason === "OUT_OF_STOCK") return NextResponse.json({ error: "Товара нет в наличии" }, { status: 409 });
  const items = await getCartForUser(session.userId, canUseWholesale(session) ? "b2b" : "b2c");
  return NextResponse.json({ items });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const originError = requireSameOrigin(req); if (originError) return originError;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const productId = parsePositiveInt((await params).productId);
  if (!productId) return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
  await db.delete(cartItems).where(and(eq(cartItems.userId, session.userId), eq(cartItems.productId, productId)));
  const items = await getCartForUser(session.userId, canUseWholesale(session) ? "b2b" : "b2c");
  return NextResponse.json({ items });
}
