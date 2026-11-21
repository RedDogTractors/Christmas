import crypto from 'crypto';

export function cleanName(raw) {
  return String(raw || '').trim().replace(/\s+/g, ' ');
}

export function nameKey(raw) {
  return cleanName(raw).toLowerCase();
}

export function validPin(pin) {
  return /^\d{4,8}$/.test(String(pin || ''));
}

// Constant-time comparison for shared codes.
export function codesMatch(given, expected) {
  if (!expected) return false;
  const a = crypto.createHash('sha256').update(String(given || '').trim()).digest();
  const b = crypto.createHash('sha256').update(String(expected).trim()).digest();
  return crypto.timingSafeEqual(a, b);
}

export function parseMoney(raw) {
  const s = String(raw ?? '').replace(/[$,\s]/g, '');
  if (s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 10000000) return undefined; // undefined = invalid
  return Math.round(n * 100) / 100;
}

export function parseUrl(raw) {
  let s = String(raw || '').trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

export function parseIntIn(raw, min, max) {
  const n = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}
