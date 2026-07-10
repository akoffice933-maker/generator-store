import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(5),
  password: z.string().min(6),
  segment: z.enum(["b2c", "b2b"]).default("b2c"),
  companyName: z.string().optional(),
  inn: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте правильность заполнения полей" }, { status: 400 });
  }
  const { name, email, phone, password, segment, companyName, inn } = parsed.data;

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "Пользователь с таким e-mail уже зарегистрирован" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      phone,
      passwordHash,
      segment,
      companyName: segment === "b2b" ? companyName : null,
      inn: segment === "b2b" ? inn : null,
      b2bStatus: segment === "b2b" ? "pending" : "none",
    })
    .returning();

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    segment: user.segment,
  });
  await setSessionCookie(token);

  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, segment: user.segment } });
}
