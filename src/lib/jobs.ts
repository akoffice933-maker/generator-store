import { Queue } from "bullmq";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { backgroundJobs } from "@/db/schema";
import { getBullMqConnection } from "@/lib/redis";

export const JOB_QUEUE_NAME = "generator-store";
type JobName = "order.created" | "lead.created" | "warranty.registered" | "payment.succeeded";

const globalForJobs = globalThis as typeof globalThis & { __generatorStoreQueue?: Queue };

export async function getJobQueue() {
  const connection = getBullMqConnection();
  if (!connection) return null;
  if (!globalForJobs.__generatorStoreQueue) globalForJobs.__generatorStoreQueue = new Queue(JOB_QUEUE_NAME, { connection });
  return globalForJobs.__generatorStoreQueue;
}

/** Add a durable outbox event. Call this inside the business DB transaction. */
export async function createOutboxJob(writer: Pick<typeof db, "insert">, name: JobName, payload: Record<string, unknown>) {
  const [job] = await writer.insert(backgroundJobs).values({ name, payload }).returning({ id: backgroundJobs.id });
  return job.id;
}

/** Best-effort enqueue after commit. Failures leave the durable outbox record pending. */
export async function enqueueOutboxJob(outboxId: number) {
  try {
    const queue = await getJobQueue();
    if (!queue) return false;
    await queue.add("process-outbox", { outboxId }, { jobId: `outbox-${outboxId}`, attempts: 5, backoff: { type: "exponential", delay: 1_000 }, removeOnComplete: 500, removeOnFail: 1_000 });
    await db.update(backgroundJobs).set({ status: "queued" }).where(eq(backgroundJobs.id, outboxId));
    return true;
  } catch (error) {
    console.error("Background job enqueue deferred", error);
    return false;
  }
}

/** Worker startup and a periodic dispatcher use this to recover events queued while Redis was unavailable. */
export async function dispatchPendingOutboxJobs(limit = 100) {
  const pending = await db
    .select({ id: backgroundJobs.id })
    .from(backgroundJobs)
    .where(and(eq(backgroundJobs.status, "pending"), lte(backgroundJobs.runAfter, new Date())))
    .orderBy(asc(backgroundJobs.id))
    .limit(limit);
  await Promise.all(pending.map((job) => enqueueOutboxJob(job.id)));
  return pending.length;
}

export async function processOutboxJob(outboxId: number) {
  const [record] = await db.select().from(backgroundJobs).where(eq(backgroundJobs.id, outboxId)).limit(1);
  if (!record || record.status === "completed") return;

  await db.update(backgroundJobs).set({ status: "processing", lockedAt: new Date(), attempts: sql`${backgroundJobs.attempts} + 1`, lastError: null }).where(eq(backgroundJobs.id, outboxId));
  try {
    // Keep business events free of raw customer PII. Add delivery/e-mail adapters
    // in a separate worker integration, not inside a request handler.
    switch (record.name as JobName) {
      case "order.created":
      case "lead.created":
      case "warranty.registered":
      case "payment.succeeded":
        console.info("Processed background event", { name: record.name, outboxId });
        break;
      default:
        throw new Error(`Unsupported background event: ${record.name}`);
    }
    await db.update(backgroundJobs).set({ status: "completed", completedAt: new Date(), lockedAt: null }).where(eq(backgroundJobs.id, outboxId));
  } catch (error) {
    const lastError = error instanceof Error ? error.message.slice(0, 1_000) : "Unknown worker error";
    await db.update(backgroundJobs).set({ status: "failed", lastError, lockedAt: null }).where(eq(backgroundJobs.id, outboxId));
    throw error;
  }
}
