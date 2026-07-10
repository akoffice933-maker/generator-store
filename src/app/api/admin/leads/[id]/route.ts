import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/requireRole";
import { z } from "zod";

const schema = z.object({ status: z.enum(["new", "in_progress", "done"]) });

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  await db.update(leads).set({ status: parsed.data.status }).where(eq(leads.id, Number(id)));
  return NextResponse.json({ ok: true });
}
