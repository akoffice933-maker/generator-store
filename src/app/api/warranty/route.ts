import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { warranties, leads } from "@/db/schema";
import { z } from "zod";

const schema = z.object({
  serialNumber: z.string().min(3),
  phone: z.string().min(5),
  fullName: z.string().min(2),
  productName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте серийный номер и телефон" }, { status: 400 });
  }
  const { serialNumber, phone, fullName, productName } = parsed.data;
  const activatedAt = new Date();
  const expiresAt = new Date(activatedAt);
  expiresAt.setFullYear(expiresAt.getFullYear() + 5);

  const [warranty] = await db
    .insert(warranties)
    .values({ serialNumber, phone, fullName, productName, activatedAt, expiresAt })
    .returning();

  await db.insert(leads).values({
    type: "warranty",
    name: fullName,
    phone,
    comment: `Регистрация гарантии. Серийный номер: ${serialNumber}${productName ? `, модель: ${productName}` : ""}`,
  });

  return NextResponse.json({ warranty });
}
