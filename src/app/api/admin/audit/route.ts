import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { requireAdmin } from "@/lib/requireRole";

const querySchema = z.object({ page: z.coerce.number().int().min(1).max(10_000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(30), entityType: z.string().trim().max(50).optional(), actorUserId: z.coerce.number().int().positive().optional() });

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Некорректные параметры" }, { status: 400 });
  const { page, pageSize, entityType, actorUserId } = parsed.data;
  const conditions = [];
  if (entityType) conditions.push(eq(auditLogs.entityType, entityType));
  if (actorUserId) conditions.push(eq(auditLogs.actorUserId, actorUserId));
  const where = conditions.length ? and(...conditions) : undefined;
  const [items, count] = await Promise.all([
    where ? db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt), desc(auditLogs.id)).limit(pageSize).offset((page - 1) * pageSize) : db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt), desc(auditLogs.id)).limit(pageSize).offset((page - 1) * pageSize),
    where ? db.select({ count: sql<number>`count(*)::int` }).from(auditLogs).where(where) : db.select({ count: sql<number>`count(*)::int` }).from(auditLogs),
  ]);
  return NextResponse.json({ items, page, pageSize, total: count[0]?.count ?? 0 });
}
