import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_MAX_AGE, sameSecret, sessionToken } from '@/lib/session';

/** Password-only sign-in for the hosted app; sets the session cookie that proxy.ts checks. */
export async function POST(request: Request) {
  const password = process.env.KATHA_PASSWORD;
  if (!password) {
    return NextResponse.json({ error: 'The studio is locked: no password is set on the server.' }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  const given = typeof body?.password === 'string' ? body.password : '';
  if (!sameSecret(given, password)) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sessionToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
