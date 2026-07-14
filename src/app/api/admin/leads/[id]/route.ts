import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/requireRole";
import { parsePositiveInt, readJsonBody, requireSameOrigin } from "@/lib/http";
import { z } from "zod";

const schema = z.object({ status: z.enum(["new", "in_progress", "done"]) });

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(req); if (originError) return originError;
  if (!await requireStaff()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const leadId = parsePositiveInt((await params).id); if (!leadId) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  const body = await readJsonBody(req); if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data); if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  const [updated] = await db.update(leads).set({ status: parsed.data.status }).where(eq(leads.id, leadId)).returning({ id: leads.id });
  return updated ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Не найдено" }, { status: 404 });
}
