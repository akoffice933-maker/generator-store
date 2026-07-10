import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, leads, products, users } from "@/db/schema";
import { sql, desc, eq, gte } from "drizzle-orm";
import { requireStaff } from "@/lib/requireRole";

export async function GET() {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [orderStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      revenue: sql<string>`coalesce(sum(${orders.totalAmount}) filter (where ${orders.status} != 'cancelled'), 0)`,
    })
    .from(orders);

  const [newLeadsCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leads)
    .where(eq(leads.status, "new"));

  const [productsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(products);
  const [usersCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users);

  const topProducts = await db
    .select({
      productName: orderItems.productName,
      totalQty: sql<number>`sum(${orderItems.qty})::int`,
    })
    .from(orderItems)
    .groupBy(orderItems.productName)
    .orderBy(desc(sql`sum(${orderItems.qty})`))
    .limit(5);

  const recentOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5);

  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  const [recentRevenue] = await db
    .select({ revenue: sql<string>`coalesce(sum(${orders.totalAmount}), 0)`, count: sql<number>`count(*)::int` })
    .from(orders)
    .where(gte(orders.createdAt, last30));

  return NextResponse.json({
    totalOrders: orderStats?.count ?? 0,
    totalRevenue: orderStats?.revenue ?? "0",
    newLeads: newLeadsCount?.count ?? 0,
    totalProducts: productsCount?.count ?? 0,
    totalUsers: usersCount?.count ?? 0,
    topProducts,
    recentOrders,
    last30Revenue: recentRevenue?.revenue ?? "0",
    last30Count: recentRevenue?.count ?? 0,
  });
}
