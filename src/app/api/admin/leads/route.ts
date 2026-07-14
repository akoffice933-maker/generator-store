import { NextResponse } from "next/server";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireStaff } from "@/lib/requireRole";

export async function GET() {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(100);
  return NextResponse.json({ items: rows });
}
