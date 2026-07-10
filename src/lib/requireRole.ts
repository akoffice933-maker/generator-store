import { getSession, type SessionPayload } from "@/lib/auth";

export async function requireStaff(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== "admin" && session.role !== "manager") return null;
  return session;
}

export async function requireAdmin(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== "admin") return null;
  return session;
}
