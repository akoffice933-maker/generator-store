import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { backgroundJobs } from "@/db/schema";
import { requireStaff } from "@/lib/requireRole";

const querySchema = z.object({ page: z.coerce.number().int().min(1).max(10_000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(30), status: z.enum(["pending", "queued", "processing", "completed", "failed"]).optional() });

export async function GET(req: NextRequest) {
  if (!await requireStaff()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Некорректные параметры" }, { status: 400 });
  const { page, pageSize, status } = parsed.data;
  const where = status ? and(eq(backgroundJobs.status, status)) : undefined;
  const [items, count] = await Promise.all([
    where ? db.select().from(backgroundJobs).where(where).orderBy(desc(backgroundJobs.createdAt)).limit(pageSize).offset((page - 1) * pageSize) : db.select().from(backgroundJobs).orderBy(desc(backgroundJobs.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    where ? db.select({ count: sql<number>`count(*)::int` }).from(backgroundJobs).where(where) : db.select({ count: sql<number>`count(*)::int` }).from(backgroundJobs),
  ]);
  return NextResponse.json({ items, page, pageSize, total: count[0]?.count ?? 0 });
}
