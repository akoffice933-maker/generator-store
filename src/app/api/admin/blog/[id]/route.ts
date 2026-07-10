import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/requireRole";
import { z } from "zod";

const schema = z.object({
  slug: z.string().min(2),
  title: z.string().min(2),
  excerpt: z.string().min(2),
  content: z.string().min(2),
  coverImage: z.string().optional(),
  category: z.string().default("Статьи"),
  readTimeMinutes: z.number().int().min(1).default(5),
  tags: z.array(z.string()).default([]),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  const [post] = await db.update(blogPosts).set(parsed.data).where(eq(blogPosts.id, Number(id))).returning();
  return NextResponse.json({ post });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await db.delete(blogPosts).where(eq(blogPosts.id, Number(id)));
  return NextResponse.json({ ok: true });
}
