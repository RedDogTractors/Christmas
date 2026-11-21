import { sql } from './db';
import { num } from './format';

// Family overview for a giver. Never includes the viewer's own list.
export async function getFamilyOverview(meId) {
  return sql`
    SELECT u.id, u.name,
      COUNT(i.id)::int AS item_count,
      COALESCE(SUM(CASE WHEN i.id IS NOT NULL AND i.quantity >
        COALESCE((SELECT SUM(c.quantity) FROM claims c WHERE c.item_id = i.id), 0)
        + (SELECT COUNT(*) FROM group_gifts g WHERE g.item_id = i.id)
        THEN 1 ELSE 0 END), 0)::int AS open_count
    FROM users u
    LEFT JOIN items i ON i.owner_id = u.id AND i.removed_at IS NULL
    WHERE u.id <> ${meId}
    GROUP BY u.id, u.name
    ORDER BY lower(u.name)`;
}

// The owner's own list: item details only. Deliberately no claim or group data.
export async function getOwnList(meId) {
  return sql`
    SELECT id, name, url, price, notes, quantity
    FROM items
    WHERE owner_id = ${meId} AND removed_at IS NULL
    ORDER BY created_at`;
}

// Someone else's list, with who has claimed what. Refuses to run for the owner.
export async function getListForGiver(ownerId, meId) {
  if (ownerId === meId) throw new Error('Owners cannot view claims on their own list.');

  const items = await sql`
    SELECT id, name, url, price, notes, quantity
    FROM items
    WHERE owner_id = ${ownerId} AND removed_at IS NULL
    ORDER BY created_at`;
  if (items.length === 0) return [];
  const ids = items.map((i) => i.id);

  const [claims, groups, members] = await Promise.all([
    sql`SELECT c.item_id, c.user_id, c.quantity, c.purchased, u.name
        FROM claims c JOIN users u ON u.id = c.user_id
        WHERE c.item_id = ANY(${ids})
        ORDER BY c.created_at`,
    sql`SELECT g.id, g.item_id, g.organizer_id, g.purchased, u.name AS organizer_name
        FROM group_gifts g JOIN users u ON u.id = g.organizer_id
        WHERE g.item_id = ANY(${ids})
        ORDER BY g.created_at`,
    sql`SELECT m.group_id, m.user_id, m.amount, u.name
        FROM group_members m
        JOIN users u ON u.id = m.user_id
        JOIN group_gifts g ON g.id = m.group_id
        WHERE g.item_id = ANY(${ids})
        ORDER BY m.joined_at`,
  ]);

  return items.map((item) => {
    const itemClaims = claims.filter((c) => c.item_id === item.id);
    const itemGroups = groups
      .filter((g) => g.item_id === item.id)
      .map((g) => {
        const gm = members.filter((m) => m.group_id === g.id);
        return {
          ...g,
          members: gm,
          pledged: gm.reduce((sum, m) => sum + (num(m.amount) || 0), 0),
          isMember: gm.some((m) => m.user_id === meId),
          myAmount: num(gm.find((m) => m.user_id === meId)?.amount),
        };
      });
    const claimedUnits = itemClaims.reduce((s, c) => s + c.quantity, 0);
    const myClaim = itemClaims.find((c) => c.user_id === meId) || null;
    const remaining = Math.max(0, item.quantity - claimedUnits - itemGroups.length);
    return { ...item, price: num(item.price), claims: itemClaims, groups: itemGroups, myClaim, remaining };
  });
}

// Everything the viewer has committed to, across the family.
export async function getShoppingList(meId) {
  const [claims, groups] = await Promise.all([
    sql`SELECT c.item_id, c.quantity, c.purchased,
          i.name, i.url, i.price, i.removed_at, u.id AS owner_id, u.name AS owner_name
        FROM claims c
        JOIN items i ON i.id = c.item_id
        JOIN users u ON u.id = i.owner_id
        WHERE c.user_id = ${meId}
        ORDER BY lower(u.name), c.created_at`,
    sql`SELECT g.id AS group_id, g.purchased, g.organizer_id, m.amount,
          i.name, i.url, i.price, i.removed_at, u.id AS owner_id, u.name AS owner_name,
          o.name AS organizer_name,
          (SELECT COALESCE(SUM(mm.amount), 0) FROM group_members mm WHERE mm.group_id = g.id) AS pledged,
          (SELECT COUNT(*)::int FROM group_members mm WHERE mm.group_id = g.id) AS member_count
        FROM group_members m
        JOIN group_gifts g ON g.id = m.group_id
        JOIN items i ON i.id = g.item_id
        JOIN users u ON u.id = i.owner_id
        JOIN users o ON o.id = g.organizer_id
        WHERE m.user_id = ${meId}
        ORDER BY lower(u.name), g.created_at`,
  ]);
  return { claims, groups };
}
