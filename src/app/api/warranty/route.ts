import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { warranties, leads } from "@/db/schema";
import { readJsonBody, requireSameOrigin } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { createOutboxJob, enqueueOutboxJob } from "@/lib/jobs";
import { z } from "zod";

const schema = z.object({
  serialNumber: z.string().trim().toUpperCase().min(3).max(100),
  phone: z.string().trim().min(5).max(32),
  fullName: z.string().trim().min(2).max(150),
  productName: z.string().trim().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req);
  if (originError) return originError;
  const limited = await rateLimit(req, { bucket: "warranty", limit: 3, windowMs: 24 * 60 * 60 * 1000 });
  if (limited) return limited;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Проверьте серийный номер и телефон" }, { status: 400 });

  const { serialNumber, phone, fullName, productName } = parsed.data;
  const activatedAt = new Date();
  const expiresAt = new Date(activatedAt);
  expiresAt.setFullYear(expiresAt.getFullYear() + 5);

  try {
    const { warranty, outboxJobId } = await db.transaction(async (tx) => {
      const [created] = await tx.insert(warranties).values({ serialNumber, phone, fullName, productName, activatedAt, expiresAt }).returning();
      await tx.insert(leads).values({
        type: "warranty", name: fullName, phone,
        comment: `Регистрация гарантии. Серийный номер: ${serialNumber}${productName ? `, модель: ${productName}` : ""}`,
      });
      const outboxJobId = await createOutboxJob(tx, "warranty.registered", { warrantyId: created.id, serialNumber: created.serialNumber });
      return { warranty: created, outboxJobId };
    });
    void enqueueOutboxJob(outboxJobId);
    return NextResponse.json({ warranty }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return NextResponse.json({ error: "Гарантия с таким серийным номером уже зарегистрирована" }, { status: 409 });
    }
    throw error;
  }
}
