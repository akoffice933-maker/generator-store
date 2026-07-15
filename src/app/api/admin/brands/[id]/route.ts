import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { parsePositiveInt, readJsonBody, requireSameOrigin } from "@/lib/http";
import { requireStaff } from "@/lib/requireRole";
import { brandSchema } from "../route";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(req); if (originError) return originError;
  const session = await requireStaff(); if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const brandId = parsePositiveInt((await params).id); if (!brandId) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  const body = await readJsonBody(req); if (!body.ok) return body.response;
  const parsed = brandSchema.safeParse(body.data); if (!parsed.success) return NextResponse.json({ error: "Некорректные данные бренда" }, { status: 400 });
  try {
    const [brand] = await db.update(brands).set(parsed.data).where(eq(brands.id, brandId)).returning();
    if (!brand) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    await writeAuditLog(session, { action: "brand.update", entityType: "brand", entityId: brand.id, metadata: { slug: brand.slug } });
    return NextResponse.json({ brand });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") return NextResponse.json({ error: "Такой slug уже используется" }, { status: 409 });
    throw error;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(req); if (originError) return originError;
  const session = await requireStaff(); if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const brandId = parsePositiveInt((await params).id); if (!brandId) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  try {
    const [brand] = await db.delete(brands).where(eq(brands.id, brandId)).returning({ id: brands.id, slug: brands.slug });
    if (!brand) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    await writeAuditLog(session, { action: "brand.delete", entityType: "brand", entityId: brand.id, metadata: { slug: brand.slug } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23503") return NextResponse.json({ error: "Нельзя удалить бренд, пока он привязан к товарам" }, { status: 409 });
    throw error;
  }
}
