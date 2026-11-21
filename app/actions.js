'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { sql, ensureSchema } from '@/lib/db';
import { createSession, destroySession } from '@/lib/session';
import { requireUser } from '@/lib/auth';
import {
  cleanName, nameKey, validPin, codesMatch, parseMoney, parseUrl, parseIntIn,
} from '@/lib/validate';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

function refresh() {
  revalidatePath('/', 'layout');
}

// ---------- Accounts ----------

export async function register(_prev, formData) {
  await ensureSchema();
  if (!process.env.FAMILY_CODE) return { error: 'The family code hasn’t been set up yet. Ask whoever runs the site.' };
  if (!codesMatch(formData.get('code'), process.env.FAMILY_CODE)) return { error: 'That family code isn’t right.' };

  const name = cleanName(formData.get('name'));
  const pin = String(formData.get('pin') || '');
  if (name.length < 1 || name.length > 40) return { error: 'Enter a name up to 40 characters.' };
  if (!validPin(pin)) return { error: 'Your PIN should be 4 to 8 digits.' };
  if (pin !== String(formData.get('pin2') || '')) return { error: 'The two PINs don’t match.' };

  const hash = await bcrypt.hash(pin, 10);
  const rows = await sql`
    INSERT INTO users (name, name_key, pin_hash) VALUES (${name}, ${nameKey(name)}, ${hash})
    ON CONFLICT (name_key) DO NOTHING
    RETURNING id`;
  if (rows.length === 0) {
    return { error: `Someone already signed up as “${name}”. Sign in instead, or add a last initial.` };
  }
  createSession(rows[0].id);
  redirect('/me');
}

export async function login(_prev, formData) {
  await ensureSchema();
  const key = nameKey(formData.get('name'));
  const pin = String(formData.get('pin') || '');
  const rows = await sql`SELECT id, pin_hash, failed_attempts, locked_until FROM users WHERE name_key = ${key}`;
  const user = rows[0];
  if (!user) return { error: 'That name and PIN don’t match. Check the spelling you signed up with.' };

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const mins = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    return { error: `Too many wrong PINs. Try again in ${mins} minute${mins === 1 ? '' : 's'}.` };
  }

  const ok = await bcrypt.compare(pin, user.pin_hash);
  if (!ok) {
    const attempts = user.failed_attempts + 1;
    if (attempts >= MAX_FAILED) {
      await sql`UPDATE users SET failed_attempts = 0,
        locked_until = now() + make_interval(mins => ${LOCK_MINUTES}) WHERE id = ${user.id}`;
      return { error: `Too many wrong PINs. Try again in ${LOCK_MINUTES} minutes.` };
    }
    await sql`UPDATE users SET failed_attempts = ${attempts} WHERE id = ${user.id}`;
    return { error: 'That name and PIN don’t match. Check the spelling you signed up with.' };
  }

  await sql`UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ${user.id}`;
  createSession(user.id);
  redirect('/family');
}

export async function resetPin(_prev, formData) {
  await ensureSchema();
  if (!process.env.ADMIN_CODE) return { error: 'PIN resets aren’t set up. Add ADMIN_CODE in Vercel.' };
  if (!codesMatch(formData.get('admin'), process.env.ADMIN_CODE)) return { error: 'That admin code isn’t right.' };
  const pin = String(formData.get('pin') || '');
  if (!validPin(pin)) return { error: 'The new PIN should be 4 to 8 digits.' };
  if (pin !== String(formData.get('pin2') || '')) return { error: 'The two PINs don’t match.' };

  const hash = await bcrypt.hash(pin, 10);
  const rows = await sql`
    UPDATE users SET pin_hash = ${hash}, failed_attempts = 0, locked_until = NULL
    WHERE name_key = ${nameKey(formData.get('name'))} RETURNING name`;
  if (rows.length === 0) return { error: 'No one has signed up with that name.' };
  return { ok: `PIN reset for ${rows[0].name}.` };
}

export async function changePin(_prev, formData) {
  const me = await requireUser();
  const rows = await sql`SELECT pin_hash FROM users WHERE id = ${me.id}`;
  if (!(await bcrypt.compare(String(formData.get('current') || ''), rows[0].pin_hash))) {
    return { error: 'Your current PIN isn’t right.' };
  }
  const pin = String(formData.get('pin') || '');
  if (!validPin(pin)) return { error: 'The new PIN should be 4 to 8 digits.' };
  if (pin !== String(formData.get('pin2') || '')) return { error: 'The two new PINs don’t match.' };
  await sql`UPDATE users SET pin_hash = ${await bcrypt.hash(pin, 10)} WHERE id = ${me.id}`;
  return { ok: 'PIN changed.' };
}

export async function logout() {
  destroySession();
  redirect('/');
}

// ---------- Your own list ----------

export async function saveItem(_prev, formData) {
  const me = await requireUser();
  const id = parseIntIn(formData.get('id'), 1, 2147483647);
  const name = String(formData.get('name') || '').trim();
  const url = parseUrl(formData.get('url'));
  const price = parseMoney(formData.get('price'));
  const notes = String(formData.get('notes') || '').trim() || null;
  const quantity = parseIntIn(formData.get('quantity') || '1', 1, 99);

  if (!name || name.length > 120) return { error: 'Give the gift a name (up to 120 characters).' };
  if (url === undefined) return { error: 'That link doesn’t look like a web address.' };
  if (price === undefined) return { error: 'Enter the price as a number, like 24.99.' };
  if (notes && notes.length > 500) return { error: 'Keep notes under 500 characters.' };
  if (!quantity) return { error: 'Quantity should be between 1 and 99.' };

  if (id) {
    await sql`UPDATE items SET name = ${name}, url = ${url}, price = ${price}, notes = ${notes}, quantity = ${quantity}
      WHERE id = ${id} AND owner_id = ${me.id} AND removed_at IS NULL`;
  } else {
    await sql`INSERT INTO items (owner_id, name, url, price, notes, quantity)
      VALUES (${me.id}, ${name}, ${url}, ${price}, ${notes}, ${quantity})`;
  }
  refresh();
  return { ok: id ? 'Saved.' : 'Added to your list.', at: Date.now() };
}

// Soft delete: anyone who already claimed it still sees it on their shopping list, flagged.
export async function removeItem(formData) {
  const me = await requireUser();
  const id = parseIntIn(formData.get('id'), 1, 2147483647);
  if (!id) return;
  await sql`UPDATE items SET removed_at = now() WHERE id = ${id} AND owner_id = ${me.id}`;
  refresh();
}

// ---------- Claiming gifts for others ----------

// Units still free on an item, optionally ignoring the viewer's own claim (for edits).
async function claimableItem(itemId, meId, { ignoreMyClaim }) {
  const rows = await sql`
    SELECT i.id, i.owner_id,
      (i.quantity
        - COALESCE((SELECT SUM(c.quantity) FROM claims c
                    WHERE c.item_id = i.id AND (${!ignoreMyClaim} OR c.user_id <> ${meId})), 0)
        - (SELECT COUNT(*) FROM group_gifts g WHERE g.item_id = i.id))::int AS remaining
    FROM items i
    WHERE i.id = ${itemId} AND i.removed_at IS NULL`;
  const item = rows[0];
  if (!item || item.owner_id === meId) return null;
  return item;
}

export async function setClaim(formData) {
  const me = await requireUser();
  const itemId = parseIntIn(formData.get('itemId'), 1, 2147483647);
  const qty = parseIntIn(formData.get('quantity'), 0, 99);
  if (!itemId || qty === null) return;

  if (qty === 0) {
    await sql`DELETE FROM claims WHERE item_id = ${itemId} AND user_id = ${me.id}`;
  } else {
    const item = await claimableItem(itemId, me.id, { ignoreMyClaim: true });
    if (!item || item.remaining < 1) return;
    const take = Math.min(qty, item.remaining);
    await sql`INSERT INTO claims (item_id, user_id, quantity) VALUES (${itemId}, ${me.id}, ${take})
      ON CONFLICT (item_id, user_id) DO UPDATE SET quantity = EXCLUDED.quantity`;
  }
  refresh();
}

export async function toggleClaimPurchased(formData) {
  const me = await requireUser();
  const itemId = parseIntIn(formData.get('itemId'), 1, 2147483647);
  if (!itemId) return;
  await sql`UPDATE claims SET purchased = NOT purchased WHERE item_id = ${itemId} AND user_id = ${me.id}`;
  refresh();
}

export async function startGroup(formData) {
  const me = await requireUser();
  const itemId = parseIntIn(formData.get('itemId'), 1, 2147483647);
  const amount = parseMoney(formData.get('amount'));
  if (!itemId || amount === undefined) return;
  const item = await claimableItem(itemId, me.id, { ignoreMyClaim: false });
  if (!item || item.remaining < 1) return;
  await sql`
    WITH g AS (INSERT INTO group_gifts (item_id, organizer_id) VALUES (${itemId}, ${me.id}) RETURNING id)
    INSERT INTO group_members (group_id, user_id, amount) SELECT id, ${me.id}, ${amount} FROM g`;
  refresh();
}

export async function joinGroup(formData) {
  const me = await requireUser();
  const groupId = parseIntIn(formData.get('groupId'), 1, 2147483647);
  const amount = parseMoney(formData.get('amount'));
  if (!groupId || amount === undefined) return;
  await sql`
    INSERT INTO group_members (group_id, user_id, amount)
    SELECT g.id, ${me.id}, ${amount}
    FROM group_gifts g JOIN items i ON i.id = g.item_id
    WHERE g.id = ${groupId} AND i.owner_id <> ${me.id} AND i.removed_at IS NULL
    ON CONFLICT (group_id, user_id) DO UPDATE SET amount = EXCLUDED.amount`;
  refresh();
}

export async function leaveGroup(formData) {
  const me = await requireUser();
  const groupId = parseIntIn(formData.get('groupId'), 1, 2147483647);
  if (!groupId) return;
  await sql`DELETE FROM group_members WHERE group_id = ${groupId} AND user_id = ${me.id}`;
  // Last one out closes the group; otherwise hand organizing to the earliest remaining member.
  await sql`DELETE FROM group_gifts g WHERE g.id = ${groupId}
    AND NOT EXISTS (SELECT 1 FROM group_members m WHERE m.group_id = g.id)`;
  await sql`UPDATE group_gifts g SET organizer_id =
      (SELECT m.user_id FROM group_members m WHERE m.group_id = g.id ORDER BY m.joined_at LIMIT 1)
    WHERE g.id = ${groupId} AND g.organizer_id = ${me.id}`;
  refresh();
}

export async function toggleGroupPurchased(formData) {
  const me = await requireUser();
  const groupId = parseIntIn(formData.get('groupId'), 1, 2147483647);
  if (!groupId) return;
  await sql`UPDATE group_gifts SET purchased = NOT purchased WHERE id = ${groupId} AND organizer_id = ${me.id}`;
  refresh();
}
