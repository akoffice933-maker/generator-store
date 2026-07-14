import { NextResponse } from "next/server";
import { canUseWholesale, getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ user: { ...session, canUseWholesale: canUseWholesale(session) } }, { headers: { "Cache-Control": "no-store" } });
}
