import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, invoices, products, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { generateOrderNumber } from "@/lib/format";
import { z } from "zod";

const itemSchema = z.object({
  productId: z.number(),
  qty: z.number().min(1),
});

const schema = z.object({
  // Присланный клиентом segment используется только для формы (например, чтобы
  // показать нужные поля ИНН/компании); на цену и итоговый заказ он не влияет —
  // реальный сегмент определяется на сервере по данным сессии/б2б-статусу.
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

  // Реальный сегмент (а значит и цена — розница/опт) определяется ТОЛЬКО на
  // сервере по актуальному статусу пользователя в БД, а не по тому, что
  // прислал клиент. Так покупатель не может подделать запрос и получить
  // оптовую цену без одобренного B2B-статуса.
  let effectiveSegment: "b2c" | "b2b" = "b2c";
  if (session) {
    const [dbUser] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (dbUser && dbUser.segment === "b2b" && dbUser.b2bStatus === "approved") {
      effectiveSegment = "b2b";
    }
  }

  const productRows = await db
    .select()
    .from(products)
    .where(sql`${products.id} = ANY(${data.items.map((i) => i.productId)})`);

  if (productRows.length === 0) {
    return NextResponse.json({ error: "Товары не найдены" }, { status: 400 });
  }

  // Проверяем наличие на складе ДО оформления заказа, чтобы не продавать
  // больше, чем есть физически.
  for (const item of data.items) {
    const product = productRows.find((p) => p.id === item.productId);
    if (!product) {
      return NextResponse.json({ error: "Товар не найден" }, { status: 400 });
    }
    if (product.stock < item.qty) {
      return NextResponse.json(
        { error: `Недостаточно товара «${product.name}» на складе (доступно: ${product.stock})` },
        { status: 409 }
      );
    }
  }

  let total = 0;
  const itemsToInsert = data.items.map((item) => {
    const product = productRows.find((p) => p.id === item.productId)!;
    const price = Number(effectiveSegment === "b2b" ? product.priceWholesale : product.priceRetail);
    total += price * item.qty;
    return {
      productId: product.id,
      productName: product.name,
      qty: item.qty,
      price: price.toString(),
    };
  });

  const orderNumber = generateOrderNumber();

  try {
    const { order, invoice } = await db.transaction(async (tx) => {
      // Атомарно списываем склад с проверкой достаточности остатка прямо в
      // WHERE — это закрывает состояние гонки при параллельных заказах.
      for (const item of data.items) {
        const updated = await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${item.qty}` })
          .where(sql`${products.id} = ${item.productId} AND ${products.stock} >= ${item.qty}`)
          .returning({ id: products.id });
        if (updated.length === 0) {
          throw new Error("OUT_OF_STOCK");
        }
      }

      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber,
          userId: session?.userId,
          segment: effectiveSegment,
          // Реальной интеграции с платёжным шлюзом (СБП/эквайринг) пока нет,
          // поэтому ни один заказ не считается оплаченным автоматически.
          // Статус "paid" должен выставляться вебхуком от платёжного провайдера
          // после подтверждения фактической транзакции.
          status: "new",
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

      await tx.insert(orderItems).values(itemsToInsert.map((item) => ({ ...item, orderId: order.id })));

      let invoice = null;
      if (data.paymentMethod === "invoice") {
        const invoiceNumber = `СЧ-${order.orderNumber}`;
        const [inv] = await tx
          .insert(invoices)
          .values({ orderId: order.id, number: invoiceNumber, amount: total.toString(), status: "issued" })
          .returning();
        invoice = inv;
      }

      return { order, invoice };
    });

    return NextResponse.json({ order, invoice });
  } catch (err) {
    if (err instanceof Error && err.message === "OUT_OF_STOCK") {
      return NextResponse.json(
        { error: "Один из товаров закончился на складе, пока вы оформляли заказ. Обновите корзину." },
        { status: 409 }
      );
    }
    throw err;
  }
}
