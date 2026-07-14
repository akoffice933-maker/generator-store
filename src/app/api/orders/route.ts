import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, invoices, products, users } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { generateOrderNumber } from "@/lib/format";
import { readJsonBody, requireSameOrigin } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { createOnlinePayment, onlinePaymentsEnabled } from "@/lib/yookassa";
import { z } from "zod";

const itemSchema = z.object({ productId: z.number().int().positive(), qty: z.number().int().min(1).max(99) });
const schema = z.object({
  customerName: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(5).max(32),
  email: z.string().trim().email().max(254),
  address: z.string().trim().max(500).optional(),
  companyName: z.string().trim().max(200).optional(),
  inn: z.string().trim().max(32).optional(),
  paymentMethod: z.enum(["sbp", "card", "invoice"]),
  comment: z.string().trim().max(2_000).optional(),
  clientRequestId: z.string().uuid(),
  items: z.array(itemSchema).min(1).max(20),
}).superRefine((data, ctx) => {
  const ids = new Set<number>();
  for (const item of data.items) {
    if (ids.has(item.productId)) {
      ctx.addIssue({ code: "custom", message: "Товар нельзя передавать дважды", path: ["items"] });
      break;
    }
    ids.add(item.productId);
  }
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ orders: [] }, { headers: { "Cache-Control": "no-store" } });

  const rows = await db.select().from(orders).where(eq(orders.userId, session.userId)).orderBy(desc(orders.createdAt)).limit(100);
  const orderIds = rows.map((row) => row.id);
  const [items, invoiceRows] = await Promise.all([
    orderIds.length ? db.select().from(orderItems).where(sql`${orderItems.orderId} = ANY(${orderIds})`) : Promise.resolve([]),
    orderIds.length ? db.select().from(invoices).where(sql`${invoices.orderId} = ANY(${orderIds})`) : Promise.resolve([]),
  ]);
  const result = rows.map((order) => ({ ...order, items: items.filter((item) => item.orderId === order.id), invoice: invoiceRows.find((invoice) => invoice.orderId === order.id) ?? null }));
  return NextResponse.json({ orders: result }, { headers: { "Cache-Control": "no-store" } });
}

async function cancelUnpaidOrder(orderId: number, items: { productId: number; qty: number }[]) {
  await db.transaction(async (tx) => {
    const [cancelled] = await tx
      .update(orders)
      .set({ status: "cancelled" })
      .where(and(eq(orders.id, orderId), eq(orders.status, "new")))
      .returning({ id: orders.id });
    if (!cancelled) return;
    for (const item of items) {
      await tx.update(products).set({ stock: sql`${products.stock} + ${item.qty}` }).where(eq(products.id, item.productId));
    }
  });
}

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req);
  if (originError) return originError;
  const limited = rateLimit(req, { bucket: "orders", limit: 10, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Проверьте правильность заполнения формы заказа" }, { status: 400 });
  const data = parsed.data;

  if ((data.paymentMethod === "card" || data.paymentMethod === "sbp") && !onlinePaymentsEnabled()) {
    return NextResponse.json({ error: "Онлайн-оплата временно недоступна. Выберите счёт или обратитесь к менеджеру." }, { status: 503 });
  }

  const session = await getSession();
  const [previous] = await db.select().from(orders).where(eq(orders.clientRequestId, data.clientRequestId)).limit(1);
  if (previous) {
    // An idempotent retry returns no customer PII, only the same order reference.
    return NextResponse.json({ order: { id: previous.id, orderNumber: previous.orderNumber, status: previous.status }, replayed: true });
  }

  let effectiveSegment: "b2c" | "b2b" = "b2c";
  if (session) {
    const [dbUser] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (dbUser?.segment === "b2b" && dbUser.b2bStatus === "approved") effectiveSegment = "b2b";
  }

  const productIds = data.items.map((item) => item.productId);
  const productRows = await db.select().from(products).where(sql`${products.id} = ANY(${productIds})`);
  if (productRows.length !== productIds.length) return NextResponse.json({ error: "Один или несколько товаров не найдены" }, { status: 400 });

  const unavailable = data.items.find((item) => (productRows.find((row) => row.id === item.productId)?.stock ?? 0) < item.qty);
  if (unavailable) {
    return NextResponse.json({ error: "Один из товаров закончился. Обновите корзину." }, { status: 409 });
  }

  let total = 0;
  const itemsToInsert = data.items.map((item) => {
    const product = productRows.find((row) => row.id === item.productId)!;
    const price = Number(effectiveSegment === "b2b" ? product.priceWholesale : product.priceRetail);
    if (!Number.isFinite(price)) throw new Error("INVALID_PRICE");
    total += price * item.qty;
    return { productId: product.id, productName: product.name, qty: item.qty, price: price.toFixed(2) };
  });

  try {
    const { order, invoice } = await db.transaction(async (tx) => {
      for (const item of data.items) {
        const updated = await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${item.qty}` })
          .where(sql`${products.id} = ${item.productId} AND ${products.stock} >= ${item.qty}`)
          .returning({ id: products.id });
        if (updated.length === 0) throw new Error("OUT_OF_STOCK");
      }

      const [order] = await tx.insert(orders).values({
        orderNumber: generateOrderNumber(), userId: session?.userId, segment: effectiveSegment, status: "new",
        customerName: data.customerName, phone: data.phone, email: data.email, address: data.address || null,
        companyName: data.companyName || null, inn: data.inn || null, paymentMethod: data.paymentMethod,
        totalAmount: total.toFixed(2), comment: data.comment || null, clientRequestId: data.clientRequestId,
      }).returning();
      await tx.insert(orderItems).values(itemsToInsert.map((item) => ({ ...item, orderId: order.id })));

      let invoice = null;
      if (data.paymentMethod === "invoice") {
        const [createdInvoice] = await tx.insert(invoices).values({ orderId: order.id, number: `СЧ-${order.orderNumber}`, amount: total.toFixed(2), status: "issued" }).returning();
        invoice = createdInvoice;
      }
      return { order, invoice };
    });

    if (data.paymentMethod === "invoice") return NextResponse.json({ order, invoice }, { status: 201 });

    try {
      const payment = await createOnlinePayment({ orderId: order.id, orderNumber: order.orderNumber, amount: total, email: data.email, method: data.paymentMethod });
      await db.update(orders).set({ paymentProvider: "yookassa", paymentId: payment.paymentId }).where(eq(orders.id, order.id));
      return NextResponse.json({ order, payment: { provider: "yookassa", confirmationUrl: payment.confirmationUrl } }, { status: 201 });
    } catch (error) {
      await cancelUnpaidOrder(order.id, data.items);
      console.error("Payment initialization failed", error);
      return NextResponse.json({ error: "Не удалось подготовить оплату. Заказ не создан; попробуйте ещё раз." }, { status: 502 });
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("OUT_OF_STOCK")) {
      return NextResponse.json({ error: "Один из товаров закончился, пока вы оформляли заказ. Обновите корзину." }, { status: 409 });
    }
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return NextResponse.json({ error: "Заказ уже обрабатывается. Обновите страницу личного кабинета." }, { status: 409 });
    }
    throw error;
  }
}
