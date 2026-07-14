import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const SESSION_COOKIE = "gs_session";

const secretKey = process.env.AUTH_SECRET;
if (!secretKey || secretKey.length < 32) {
  throw new Error("AUTH_SECRET must be set and contain at least 32 characters");
}
const encodedKey = new TextEncoder().encode(secretKey);

const tokenPayloadSchema = z.object({
  userId: z.number().int().positive(),
  sessionVersion: z.number().int().nonnegative(),
});

export type SessionPayload = {
  userId: number;
  email: string;
  name: string;
  role: "customer" | "manager" | "admin";
  segment: "b2c" | "b2b";
  b2bStatus: "none" | "pending" | "approved" | "rejected";
  sessionVersion: number;
};

export function canUseWholesale(session: SessionPayload | null) {
  return session?.segment === "b2b" && session.b2bStatus === "approved";
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ userId: payload.userId, sessionVersion: payload.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(encodedKey);
}

async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ["HS256"] });
    return tokenPayloadSchema.parse(payload);
  } catch {
    return null;
  }
}

/** Reads current authorization data from DB, so a role change revokes prior privileges immediately. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenPayload = await verifySessionToken(token);
  if (!tokenPayload) return null;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      segment: users.segment,
      b2bStatus: users.b2bStatus,
      sessionVersion: users.sessionVersion,
    })
    .from(users)
    .where(eq(users.id, tokenPayload.userId))
    .limit(1);

  if (!user || user.sessionVersion !== tokenPayload.sessionVersion) return null;

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    segment: user.segment,
    b2bStatus: user.b2bStatus,
    sessionVersion: user.sessionVersion,
  };
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
