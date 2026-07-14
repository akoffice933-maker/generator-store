import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { readJsonBody, requireSameOrigin } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(5).max(32),
  password: z.string().min(12).max(128),
  segment: z.enum(["b2c", "b2b"]).default("b2c"),
  companyName: z.string().trim().max(200).optional(),
  inn: z.string().trim().max(32).optional(),
});

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req);
  if (originError) return originError;
  const limited = rateLimit(req, { bucket: "auth-register", limit: 5, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Проверьте правильность заполнения полей" }, { status: 400 });

  const data = parsed.data;
  const email = data.email.toLowerCase();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return NextResponse.json({ error: "Не удалось создать учётную запись" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  try {
    const [user] = await db
      .insert(users)
      .values({
        name: data.name,
        email,
        phone: data.phone,
        passwordHash,
        segment: data.segment,
        companyName: data.segment === "b2b" ? data.companyName || null : null,
        inn: data.segment === "b2b" ? data.inn || null : null,
        b2bStatus: data.segment === "b2b" ? "pending" : "none",
      })
      .returning();

    const token = await createSessionToken({
      userId: user.id, email: user.email, name: user.name, role: user.role,
      segment: user.segment, b2bStatus: user.b2bStatus, sessionVersion: user.sessionVersion,
    });
    await setSessionCookie(token);
    return NextResponse.json({ user: { userId: user.id, name: user.name, email: user.email, role: user.role, segment: user.segment, b2bStatus: user.b2bStatus, canUseWholesale: false } }, { status: 201 });
  } catch (error) {
    // Unique-index races should not leak implementation details or produce an unhandled 500.
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return NextResponse.json({ error: "Не удалось создать учётную запись" }, { status: 409 });
    }
    throw error;
  }
}
