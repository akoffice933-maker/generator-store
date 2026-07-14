import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { canUseWholesale, createSessionToken, setSessionCookie } from "@/lib/auth";
import { readJsonBody, requireSameOrigin } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req);
  if (originError) return originError;
  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Неверный e-mail или пароль" }, { status: 401 });

  const email = parsed.data.email.toLowerCase();
  const limited = rateLimit(req, { bucket: "auth-login", identifier: email, limit: 10, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const valid = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
  if (!user || !valid) return NextResponse.json({ error: "Неверный e-mail или пароль" }, { status: 401 });

  const session = {
    userId: user.id, email: user.email, name: user.name, role: user.role,
    segment: user.segment, b2bStatus: user.b2bStatus, sessionVersion: user.sessionVersion,
  } as const;
  await setSessionCookie(await createSessionToken(session));
  return NextResponse.json({ user: { ...session, canUseWholesale: canUseWholesale(session) } });
}
