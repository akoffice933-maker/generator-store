import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, invoices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/requireRole";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["new", "paid", "processing", "shipped", "completed", "cancelled"]).optional(),
  invoiceStatus: z.enum(["issued", "paid", "cancelled"]).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });

  if (parsed.data.status) {
    await db.update(orders).set({ status: parsed.data.status }).where(eq(orders.id, Number(id)));
  }
  if (parsed.data.invoiceStatus) {
    await db.update(invoices).set({ status: parsed.data.invoiceStatus }).where(eq(invoices.orderId, Number(id)));
  }

  return NextResponse.json({ ok: true });
}
