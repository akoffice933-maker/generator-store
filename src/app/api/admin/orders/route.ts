import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, invoices } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { requireStaff } from "@/lib/requireRole";

export async function GET() {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
  const orderIds = rows.map((r) => r.id);
  const items = orderIds.length
    ? await db.select().from(orderItems).where(sql`${orderItems.orderId} = ANY(${orderIds})`)
    : [];
  const invoiceRows = orderIds.length
    ? await db.select().from(invoices).where(sql`${invoices.orderId} = ANY(${orderIds})`)
    : [];

  const result = rows.map((order) => ({
    ...order,
    items: items.filter((i) => i.orderId === order.id),
    invoice: invoiceRows.find((inv) => inv.orderId === order.id) || null,
  }));

  return NextResponse.json({ items: result });
}
