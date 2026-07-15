import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { readJsonBody, requireSameOrigin } from "@/lib/http";
import { requireStaff } from "@/lib/requireRole";

export const categorySchema = z.object({ name: z.string().trim().min(2).max(120), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120), type: z.enum(["gasoline", "diesel", "gas", "inverter"]), description: z.string().trim().max(2_000).nullable().optional() });

export async function GET() {
  if (!await requireStaff()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ items: await db.select().from(categories).orderBy(asc(categories.name)) });
}

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req); if (originError) return originError;
  const session = await requireStaff(); if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await readJsonBody(req); if (!body.ok) return body.response;
  const parsed = categorySchema.safeParse(body.data); if (!parsed.success) return NextResponse.json({ error: "Некорректные данные категории" }, { status: 400 });
  try {
    const [category] = await db.insert(categories).values(parsed.data).returning();
    await writeAuditLog(session, { action: "category.create", entityType: "category", entityId: category.id, metadata: { slug: category.slug, type: category.type } });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") return NextResponse.json({ error: "Такой slug уже используется" }, { status: 409 });
    throw error;
  }
}
