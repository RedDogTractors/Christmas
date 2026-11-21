import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE = 'wishbook_session';
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('SESSION_SECRET must be set (16+ characters).');
  return s;
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

export function createSession(userId) {
  const expires = Date.now() + MAX_AGE * 1000;
  const value = `${userId}.${expires}`;
  cookies().set(COOKIE, `${value}.${sign(value)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export function readSessionUserId() {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  const [id, expires, sig] = raw.split('.');
  if (!id || !expires || !sig) return null;
  const expected = Buffer.from(sign(`${id}.${expires}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  if (Date.now() > Number(expires)) return null;
  const n = Number(id);
  return Number.isInteger(n) ? n : null;
}

export function destroySession() {
  cookies().delete(COOKIE);
}
