import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { SessionPayload } from "@/lib/auth";

type AuditInput = {
  action: string;
  entityType: "product" | "order" | "lead" | "user" | "blog_post" | "brand" | "category" | "background_job" | "auth";
  entityId: string | number;
  /** Never include password hashes, tokens, emails, phone numbers, addresses or raw request bodies. */
  metadata?: Record<string, unknown>;
};

type AuditWriter = Pick<typeof db, "insert">;

/**
 * Writes a deliberately minimal append-only audit record. The DB migration adds
 * a trigger that rejects UPDATE/DELETE on audit_logs.
 */
export async function writeAuditLog(actor: SessionPayload, input: AuditInput, writer: AuditWriter = db) {
  await writer.insert(auditLogs).values({
    actorUserId: actor.userId,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: input.action,
    entityType: input.entityType,
    entityId: String(input.entityId),
    metadata: input.metadata ?? {},
  });
}
