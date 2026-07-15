import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, invoices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/requireRole";
import { parsePositiveInt, readJsonBody, requireSameOrigin } from "@/lib/http";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({ status: z.enum(["new", "paid", "processing", "shipped", "completed", "cancelled"]).optional(), invoiceStatus: z.enum(["issued", "paid", "cancelled"]).optional() }).refine((value) => value.status || value.invoiceStatus, { message: "No changes" });

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(req); if (originError) return originError;
  if (!await requireStaff()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const orderId = parsePositiveInt((await params).id); if (!orderId) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  const body = await readJsonBody(req); if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data); if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  const exists = await db.transaction(async (tx) => {
    const [order] = await tx.select({ id: orders.id }).from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return false;
    if (parsed.data.status) await tx.update(orders).set({ status: parsed.data.status }).where(eq(orders.id, orderId));
    if (parsed.data.invoiceStatus) await tx.update(invoices).set({ status: parsed.data.invoiceStatus }).where(eq(invoices.orderId, orderId));
    return true;
  });
  if (!exists) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  const actor = await requireStaff();
  if (actor) await writeAuditLog(actor, { action: "order.status_update", entityType: "order", entityId: orderId, metadata: { status: parsed.data.status, invoiceStatus: parsed.data.invoiceStatus } });
  return NextResponse.json({ ok: true });
}
