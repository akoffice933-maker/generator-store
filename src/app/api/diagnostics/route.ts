import { NextResponse } from "next/server";
import { db } from "@/db";
import { diagnosticSymptoms } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(diagnosticSymptoms).orderBy(asc(diagnosticSymptoms.sortOrder)).limit(100);
  return NextResponse.json({ items: rows });
}
