import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { parsePositiveInt, readJsonBody, requireSameOrigin } from "@/lib/http";
import { requireStaff } from "@/lib/requireRole";
import { categorySchema } from "../route";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(req); if (originError) return originError;
  const session = await requireStaff(); if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const categoryId = parsePositiveInt((await params).id); if (!categoryId) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  const body = await readJsonBody(req); if (!body.ok) return body.response;
  const parsed = categorySchema.safeParse(body.data); if (!parsed.success) return NextResponse.json({ error: "Некорректные данные категории" }, { status: 400 });
  try {
    const [category] = await db.update(categories).set(parsed.data).where(eq(categories.id, categoryId)).returning();
    if (!category) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    await writeAuditLog(session, { action: "category.update", entityType: "category", entityId: category.id, metadata: { slug: category.slug, type: category.type } });
    return NextResponse.json({ category });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") return NextResponse.json({ error: "Такой slug уже используется" }, { status: 409 });
    throw error;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(req); if (originError) return originError;
  const session = await requireStaff(); if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const categoryId = parsePositiveInt((await params).id); if (!categoryId) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  try {
    const [category] = await db.delete(categories).where(eq(categories.id, categoryId)).returning({ id: categories.id, slug: categories.slug });
    if (!category) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    await writeAuditLog(session, { action: "category.delete", entityType: "category", entityId: category.id, metadata: { slug: category.slug } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23503") return NextResponse.json({ error: "Нельзя удалить категорию, пока она привязана к товарам" }, { status: 409 });
    throw error;
  }
}
