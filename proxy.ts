// Password gate for the hosted app. In production everything except the public showcase
// (/welcome, its sample reels under /showcase and the login endpoint) needs a session
// cookie, because the API spends real money on Azure, Gemini, Veo and ElevenLabs.
// /api/config stays open as Render's health check, and /api/dev/* is local-only.
// Local `npm run dev` is untouched.
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, sameSecret, sessionToken } from '@/lib/session';

const OPEN_PATHS = new Set(['/welcome', '/api/login', '/api/config']);

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (process.env.NODE_ENV !== 'production') return NextResponse.next();
  if (pathname.startsWith('/api/dev/')) return new NextResponse('Not found', { status: 404 });
  if (OPEN_PATHS.has(pathname) || pathname.startsWith('/showcase/')) return NextResponse.next();

  // Fail closed: without a password on the server nothing behind the gate opens.
  const password = process.env.KATHA_PASSWORD;
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (password && cookie && sameSecret(cookie, sessionToken(password))) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return password
      ? NextResponse.json({ error: 'Sign in required' }, { status: 401 })
      : NextResponse.json({ error: 'Locked: KATHA_PASSWORD is not set on the server' }, { status: 503 });
  }
  const url = new URL('/welcome', request.url);
  if (pathname !== '/') url.searchParams.set('next', pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
