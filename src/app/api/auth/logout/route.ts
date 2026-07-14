import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/http";

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req);
  if (originError) return originError;
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
