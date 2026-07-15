import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/requireRole";
import { parsePositiveInt, readJsonBody, requireSameOrigin } from "@/lib/http";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({ slug: z.string().trim().min(2).max(160), title: z.string().trim().min(2).max(250), excerpt: z.string().trim().min(2).max(500), content: z.string().trim().min(2).max(50_000), coverImage: z.string().url().max(2_000).optional().or(z.literal("")), category: z.string().trim().min(1).max(100).default("Статьи"), readTimeMinutes: z.number().int().min(1).max(240).default(5), tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]) });

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(req); if (originError) return originError;
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const postId = parsePositiveInt((await params).id); if (!postId) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  const body = await readJsonBody(req); if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data); if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  const [post] = await db.update(blogPosts).set({ ...parsed.data, coverImage: parsed.data.coverImage || null }).where(eq(blogPosts.id, postId)).returning();
  if (!post) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  await writeAuditLog(session, { action: "blog_post.update", entityType: "blog_post", entityId: post.id, metadata: { slug: post.slug } });
  return NextResponse.json({ post });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(req); if (originError) return originError;
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const postId = parsePositiveInt((await params).id); if (!postId) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  const [deleted] = await db.delete(blogPosts).where(eq(blogPosts.id, postId)).returning({ id: blogPosts.id });
  if (!deleted) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  await writeAuditLog(session, { action: "blog_post.delete", entityType: "blog_post", entityId: deleted.id });
  return NextResponse.json({ ok: true });
}
