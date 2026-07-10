import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["quote", "master_call", "warranty", "contact"]),
  name: z.string().min(2),
  phone: z.string().min(5),
  email: z.string().email().optional().or(z.literal("")),
  companyName: z.string().optional(),
  inn: z.string().optional(),
  comment: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте правильность заполнения формы" }, { status: 400 });
  }
  const { type, name, phone, email, companyName, inn, comment } = parsed.data;
  const [lead] = await db
    .insert(leads)
    .values({ type, name, phone, email: email || null, companyName, inn, comment })
    .returning();
  return NextResponse.json({ lead });
}
