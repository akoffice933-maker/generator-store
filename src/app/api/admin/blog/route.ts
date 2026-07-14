import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireStaff } from "@/lib/requireRole";
import { z } from "zod";
import { requireSameOrigin } from "@/lib/http";
import { writeAuditLog } from "@/lib/audit";

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

export async function GET() {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.select().from(blogPosts).orderBy(desc(blogPosts.publishedAt)).limit(100);
  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req);
  if (originError) return originError;
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  const [post] = await db.insert(blogPosts).values(parsed.data).returning();
  await writeAuditLog(session, { action: "blog_post.create", entityType: "blog_post", entityId: post.id, metadata: { slug: post.slug } });
  return NextResponse.json({ post });
}
