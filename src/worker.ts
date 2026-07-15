import { Worker } from "bullmq";
import { JOB_QUEUE_NAME, dispatchPendingOutboxJobs, processOutboxJob } from "@/lib/jobs";
import { ensureRedisConnection, getBullMqConnection, getRedis } from "@/lib/redis";

const redisClient = getRedis();
const connection = getBullMqConnection();
if (!redisClient || !connection) throw new Error("REDIS_URL is required to start the background worker");
const activeRedis = redisClient;
await ensureRedisConnection(activeRedis);

const worker = new Worker(
  JOB_QUEUE_NAME,
  async (job) => {
    const outboxId = Number(job.data?.outboxId);
    if (!Number.isSafeInteger(outboxId) || outboxId < 1) throw new Error("Invalid outbox job payload");
    await processOutboxJob(outboxId);
  },
  { connection, concurrency: Number(process.env.WORKER_CONCURRENCY ?? 5) }
);

worker.on("completed", (job) => console.info("Background job completed", { id: job.id }));
worker.on("failed", (job, error) => console.error("Background job failed", { id: job?.id, error: error.message }));

await dispatchPendingOutboxJobs();
const dispatcher = setInterval(() => { void dispatchPendingOutboxJobs(); }, 30_000);

async function shutdown(signal: string) {
  console.info(`Received ${signal}; closing background worker`);
  clearInterval(dispatcher);
  await worker.close();
  await activeRedis.quit();
  process.exit(0);
}
process.on("SIGINT", () => { void shutdown("SIGINT"); });
process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
