import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { readJsonBody, requireSameOrigin } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["quote", "master_call", "warranty", "contact"]),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(5).max(32),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  companyName: z.string().trim().max(200).optional(),
  inn: z.string().trim().max(32).optional(),
  comment: z.string().trim().max(2_000).optional(),
});

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req);
  if (originError) return originError;
  const limited = rateLimit(req, { bucket: "public-leads", limit: 5, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Проверьте правильность заполнения формы" }, { status: 400 });

  const { type, name, phone, email, companyName, inn, comment } = parsed.data;
  const [lead] = await db.insert(leads).values({ type, name, phone, email: email || null, companyName, inn, comment }).returning({ id: leads.id, createdAt: leads.createdAt });
  return NextResponse.json({ lead }, { status: 201 });
}
