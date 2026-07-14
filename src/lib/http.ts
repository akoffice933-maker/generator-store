import { NextRequest, NextResponse } from "next/server";

const MAX_JSON_BYTES = 64 * 1024;

export async function readJsonBody(req: NextRequest): Promise<{ ok: true; data: unknown } | { ok: false; response: NextResponse }> {
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Слишком большой запрос" }, { status: 413 }),
    };
  }

  try {
    return { ok: true, data: await req.json() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Некорректный JSON" }, { status: 400 }),
    };
  }
}

/**
 * Browser mutations use a cookie session. SameSite is a useful baseline, but an
 * explicit origin check adds a second CSRF layer. Non-browser production calls
 * must use a trusted same-origin proxy.
 */
export function requireSameOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Missing request origin" }, { status: 403 });
    }
    return null;
  }

  try {
    const originUrl = new URL(origin);
    const forwardedHost = req.headers.get("x-forwarded-host");
    const host = forwardedHost ?? req.headers.get("host");
    const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;

    const hostMatches = host ? originUrl.host === host : false;
    const configuredMatches = configuredOrigin ? originUrl.origin === new URL(configuredOrigin).origin : false;

    if (!hostMatches && !configuredMatches) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  return null;
}

export function parsePositiveInt(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
