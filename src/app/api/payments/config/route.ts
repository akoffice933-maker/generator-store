import { NextResponse } from "next/server";
import { enabledOnlineMethods } from "@/lib/yookassa";

export async function GET() {
  // Only availability is public; provider credentials never reach the browser.
  return NextResponse.json({ onlineMethods: enabledOnlineMethods() }, { headers: { "Cache-Control": "no-store" } });
}
