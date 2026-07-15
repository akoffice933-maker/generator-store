import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { favorites } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { parsePositiveInt, requireSameOrigin } from "@/lib/http";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const originError = requireSameOrigin(req); if (originError) return originError;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const productId = parsePositiveInt((await params).productId);
  if (!productId) return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
  await db.delete(favorites).where(and(eq(favorites.userId, session.userId), eq(favorites.productId, productId)));
  return NextResponse.json({ ok: true });
}
