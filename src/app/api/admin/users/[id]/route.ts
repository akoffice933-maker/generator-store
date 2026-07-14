import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireRole";
import { parsePositiveInt, readJsonBody, requireSameOrigin } from "@/lib/http";
import { z } from "zod";

const schema = z.object({
  role: z.enum(["customer", "manager", "admin"]).optional(),
  b2bStatus: z.enum(["none", "pending", "approved", "rejected"]).optional(),
}).refine((value) => value.role !== undefined || value.b2bStatus !== undefined, { message: "No changes" });

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(req);
  if (originError) return originError;
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const userId = parsePositiveInt(id);
  if (!userId) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });

  const update: { role?: "customer" | "manager" | "admin"; b2bStatus?: "none" | "pending" | "approved" | "rejected"; sessionVersion?: ReturnType<typeof sql> } = { ...parsed.data };
  if (parsed.data.role !== undefined) update.sessionVersion = sql`${users.sessionVersion} + 1`;

  const [updated] = await db.update(users).set(update).where(eq(users.id, userId)).returning({ id: users.id });
  if (!updated) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
