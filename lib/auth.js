import { redirect } from 'next/navigation';
import { sql, ensureSchema } from './db';
import { readSessionUserId } from './session';

export async function getCurrentUser() {
  const id = readSessionUserId();
  if (!id) return null;
  await ensureSchema();
  const rows = await sql`SELECT id, name FROM users WHERE id = ${id}`;
  return rows[0] || null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/');
  return user;
}
