import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { backgroundJobs } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { parsePositiveInt, requireSameOrigin } from "@/lib/http";
import { enqueueOutboxJob } from "@/lib/jobs";
import { requireStaff } from "@/lib/requireRole";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(req); if (originError) return originError;
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const jobId = parsePositiveInt((await params).id);
  if (!jobId) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  const [job] = await db.update(backgroundJobs).set({ status: "pending", runAfter: new Date(), lastError: null, lockedAt: null }).where(and(eq(backgroundJobs.id, jobId), eq(backgroundJobs.status, "failed"))).returning({ id: backgroundJobs.id, name: backgroundJobs.name });
  if (!job) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  await writeAuditLog(session, { action: "background_job.retry", entityType: "background_job", entityId: job.id, metadata: { name: job.name } });
  void enqueueOutboxJob(job.id);
  return NextResponse.json({ ok: true });
}
