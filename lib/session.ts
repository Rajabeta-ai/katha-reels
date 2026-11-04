// Session cookie for the hosted app: an HMAC of a fixed label keyed by KATHA_PASSWORD, so
// changing the password signs everyone out and no session store is needed.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'katha_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function sessionToken(password: string): string {
  return createHmac('sha256', password).update('katha-session-v1').digest('hex');
}

export function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
