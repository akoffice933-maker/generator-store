import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireRole";
import { z } from "zod";

const schema = z.object({
  role: z.enum(["customer", "manager", "admin"]).optional(),
  b2bStatus: z.enum(["none", "pending", "approved", "rejected"]).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  await db.update(users).set(parsed.data).where(eq(users.id, Number(id)));
  return NextResponse.json({ ok: true });
}
