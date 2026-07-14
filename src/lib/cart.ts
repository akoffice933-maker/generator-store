import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, products } from "@/db/schema";
import type { PricingTier } from "@/lib/products";

export type ServerCartItem = {
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  unitPrice: number;
  stock: number;
  qty: number;
  updatedAt: Date;
};

export async function getCartForUser(userId: number, pricingTier: PricingTier): Promise<ServerCartItem[]> {
  const rows = await db
    .select({
      productId: cartItems.productId,
      qty: cartItems.qty,
      updatedAt: cartItems.updatedAt,
      slug: products.slug,
      name: products.name,
      images: products.images,
      priceRetail: products.priceRetail,
      priceWholesale: products.priceWholesale,
      stock: products.stock,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId))
    .orderBy(asc(cartItems.createdAt));

  return rows.map((row) => ({
    productId: row.productId,
    slug: row.slug,
    name: row.name,
    image: row.images[0] ?? null,
    unitPrice: Number(pricingTier === "b2b" ? row.priceWholesale : row.priceRetail),
    stock: row.stock,
    qty: Math.min(row.qty, row.stock),
    updatedAt: row.updatedAt,
  })).filter((item) => item.qty > 0);
}

export async function addCartItem(userId: number, productId: number, increment: number) {
  return db.transaction(async (tx) => {
    const [product] = await tx.select({ id: products.id, stock: products.stock }).from(products).where(eq(products.id, productId)).limit(1);
    if (!product) return { reason: "NOT_FOUND" as const };
    if (product.stock < 1) return { reason: "OUT_OF_STOCK" as const };

    const [existing] = await tx.select().from(cartItems).where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId))).limit(1);
    const qty = Math.min(product.stock, (existing?.qty ?? 0) + increment);
    if (existing) {
      await tx.update(cartItems).set({ qty, updatedAt: new Date() }).where(eq(cartItems.id, existing.id));
    } else {
      await tx.insert(cartItems).values({ userId, productId, qty });
    }
    return { reason: null, qty };
  });
}

export async function setCartItemQuantity(userId: number, productId: number, requestedQty: number) {
  return db.transaction(async (tx) => {
    const [product] = await tx.select({ id: products.id, stock: products.stock }).from(products).where(eq(products.id, productId)).limit(1);
    if (!product) return { reason: "NOT_FOUND" as const };
    if (product.stock < 1) return { reason: "OUT_OF_STOCK" as const };
    const qty = Math.min(product.stock, requestedQty);
    const [existing] = await tx.select({ id: cartItems.id }).from(cartItems).where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId))).limit(1);
    if (existing) await tx.update(cartItems).set({ qty, updatedAt: new Date() }).where(eq(cartItems.id, existing.id));
    else await tx.insert(cartItems).values({ userId, productId, qty });
    return { reason: null, qty };
  });
}
