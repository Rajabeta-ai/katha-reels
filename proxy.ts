// Password gate for the hosted app. In production every page and API route sits behind
// HTTP Basic Auth (any username, password = KATHA_PASSWORD) because the API spends real
// money on Azure, Gemini, Veo and ElevenLabs. /api/config stays open as Render's health
// check, and the /api/dev/* test endpoints are local-only. Local `npm run dev` is untouched.
import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

const OPEN_PATHS = new Set(["/api/config"]);

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (process.env.NODE_ENV !== "production") return NextResponse.next();
  if (pathname.startsWith("/api/dev/")) return new NextResponse("Not found", { status: 404 });
  if (OPEN_PATHS.has(pathname)) return NextResponse.next();

  // Fail closed: a deploy without a password stays locked rather than open.
  const password = process.env.KATHA_PASSWORD;
  if (!password) return new NextResponse("Locked: set KATHA_PASSWORD on the server to open this app.", { status: 503 });

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    if (sameSecret(decoded.slice(decoded.indexOf(":") + 1), password)) return NextResponse.next();
  }
  return new NextResponse("Password required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Katha Reels", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
