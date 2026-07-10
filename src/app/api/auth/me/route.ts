import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });

  const rows = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  const user = rows[0];
  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      segment: user.segment,
    },
  });
}
