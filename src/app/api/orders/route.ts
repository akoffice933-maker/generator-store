import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, invoices, products } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { generateOrderNumber } from "@/lib/format";
import { z } from "zod";

const itemSchema = z.object({
  productId: z.number(),
  qty: z.number().min(1),
});

const schema = z.object({
  segment: z.enum(["b2c", "b2b"]),
  customerName: z.string().min(2),
  phone: z.string().min(5),
  email: z.string().email(),
  address: z.string().optional(),
  companyName: z.string().optional(),
  inn: z.string().optional(),
  paymentMethod: z.enum(["sbp", "card", "invoice"]),
  comment: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ orders: [] });

  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, session.userId))
    .orderBy(desc(orders.createdAt));

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

  return NextResponse.json({ orders: result });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте правильность заполнения формы заказа" }, { status: 400 });
  }
  const data = parsed.data;
  const session = await getSession();

  const productRows = await db
    .select()
    .from(products)
    .where(sql`${products.id} = ANY(${data.items.map((i) => i.productId)})`);

  if (productRows.length === 0) {
    return NextResponse.json({ error: "Товары не найдены" }, { status: 400 });
  }

  let total = 0;
  const itemsToInsert = data.items.map((item) => {
    const product = productRows.find((p) => p.id === item.productId);
    if (!product) throw new Error("Product not found");
    const price = Number(data.segment === "b2b" ? product.priceWholesale : product.priceRetail);
    total += price * item.qty;
    return {
      productId: product.id,
      productName: product.name,
      qty: item.qty,
      price: price.toString(),
    };
  });

  const orderNumber = generateOrderNumber();

  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      userId: session?.userId,
      segment: data.segment,
      status: data.paymentMethod === "invoice" ? "new" : "paid",
      customerName: data.customerName,
      phone: data.phone,
      email: data.email,
      address: data.address,
      companyName: data.companyName,
      inn: data.inn,
      paymentMethod: data.paymentMethod,
      totalAmount: total.toString(),
      comment: data.comment,
    })
    .returning();

  await db.insert(orderItems).values(itemsToInsert.map((item) => ({ ...item, orderId: order.id })));

  let invoice = null;
  if (data.paymentMethod === "invoice") {
    const invoiceNumber = `СЧ-${order.orderNumber}`;
    const [inv] = await db
      .insert(invoices)
      .values({ orderId: order.id, number: invoiceNumber, amount: total.toString(), status: "issued" })
      .returning();
    invoice = inv;
  }

  for (const item of data.items) {
    await db
      .update(products)
      .set({ stock: sql`GREATEST(${products.stock} - ${item.qty}, 0)` })
      .where(eq(products.id, item.productId));
  }

  return NextResponse.json({ order, invoice });
}
