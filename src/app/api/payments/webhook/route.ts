import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { invoices, orders } from "@/db/schema";
import { getOnlinePayment } from "@/lib/yookassa";

const notificationSchema = z.object({
  event: z.string(),
  object: z.object({ id: z.string().min(1) }),
});

/**
 * YooKassa sends an unauthenticated notification body. Do not trust it: the
 * handler re-fetches the payment over the provider API and verifies payment id,
 * amount, status and metadata before changing the order.
 */
export async function POST(req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 16 * 1024) return NextResponse.json({ error: "Payload too large" }, { status: 413 });

  const parsed = notificationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });

  try {
    const payment = await getOnlinePayment(parsed.data.object.id);
    if (payment.status !== "succeeded" || payment.amount.currency !== "RUB") return NextResponse.json({ ok: true });

    const orderId = Number(payment.metadata?.orderId);
    if (!Number.isSafeInteger(orderId) || orderId <= 0) return NextResponse.json({ error: "Missing order metadata" }, { status: 400 });

    await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.paymentId, payment.id))).limit(1);
      if (!order || order.status === "cancelled") return;
      if (Number(order.totalAmount).toFixed(2) !== Number(payment.amount.value).toFixed(2)) throw new Error("PAYMENT_AMOUNT_MISMATCH");
      if (order.status !== "paid") {
        await tx.update(orders).set({ status: "paid", paidAt: new Date() }).where(eq(orders.id, order.id));
        if (order.paymentMethod === "invoice") await tx.update(invoices).set({ status: "paid" }).where(eq(invoices.orderId, order.id));
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Payment webhook verification failed", error);
    // Return 500 so the provider retries a temporary database/provider failure.
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
