import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { getShoppingList } from '@/lib/queries';
import { money, num } from '@/lib/format';
import { toggleClaimPurchased, toggleGroupPurchased } from '@/app/actions';
import Header from '@/components/Header';
import SubmitButton from '@/components/SubmitButton';

export default async function ShoppingPage() {
  const me = await requireUser();
  const { claims, groups } = await getShoppingList(me.id);

  // Group everything by recipient.
  const byOwner = new Map();
  const bucket = (id, name) => {
    if (!byOwner.has(id)) byOwner.set(id, { id, name, claims: [], groups: [] });
    return byOwner.get(id);
  };
  claims.forEach((c) => bucket(c.owner_id, c.owner_name).claims.push(c));
  groups.forEach((g) => bucket(g.owner_id, g.owner_name).groups.push(g));

  const spend =
    claims.reduce((s, c) => s + (num(c.price) || 0) * c.quantity, 0) +
    groups.reduce((s, g) => s + (num(g.amount) || 0), 0);
  const total = claims.length + groups.length;
  const done = claims.filter((c) => c.purchased).length + groups.filter((g) => g.purchased).length;

  return (
    <>
      <Header user={me} current="shopping" />
      <main className="page">
        <h1>Your shopping list</h1>
        {total === 0 ? (
          <div className="empty">
            <p>You haven’t claimed anything yet. <Link href="/family">Browse the family’s lists</Link> to get started.</p>
          </div>
        ) : (
          <>
            <p className="lede">
              {done} of {total} bought{spend > 0 ? `. About ${money(spend)} in all, based on listed prices and your group shares.` : '.'}
            </p>
            {[...byOwner.values()].map((o) => (
              <section key={o.id} className="recipient">
                <h2><Link href={`/person/${o.id}`}>For {o.name}</Link></h2>
                <ul className="checklist">
                  {o.claims.map((c) => (
                    <li key={`c${c.item_id}`} className={c.purchased ? 'done' : ''}>
                      <div>
                        <span className="item-name">
                          {c.url ? <a href={c.url} target="_blank" rel="noopener noreferrer">{c.name}</a> : c.name}
                        </span>
                        <span className="item-meta">
                          {num(c.price) !== null ? `${c.quantity > 1 ? `${c.quantity} × ` : ''}${money(c.price)}` : c.quantity > 1 ? `${c.quantity} of them` : ''}
                          {c.removed_at && <em className="warn"> {o.name} took this off their list</em>}
                        </span>
                      </div>
                      <form action={toggleClaimPurchased}>
                        <input type="hidden" name="itemId" value={c.item_id} />
                        <SubmitButton className={`check${c.purchased ? ' on' : ''}`} pendingText="…" aria-pressed={c.purchased}>
                          {c.purchased ? 'Bought' : 'Mark bought'}
                        </SubmitButton>
                      </form>
                    </li>
                  ))}
                  {o.groups.map((g) => (
                    <li key={`g${g.group_id}`} className={g.purchased ? 'done' : ''}>
                      <div>
                        <span className="item-name">
                          {g.url ? <a href={g.url} target="_blank" rel="noopener noreferrer">{g.name}</a> : g.name}
                        </span>
                        <span className="item-meta">
                          Group gift with {g.member_count - 1} other{g.member_count === 2 ? '' : 's'}
                          {num(g.amount) !== null && `, your share ${money(g.amount)}`}
                          {num(g.price) !== null && `, ${money(g.pledged)} of ${money(g.price)} pledged`}
                          {g.organizer_id !== me.id && `, ${g.organizer_name} is buying it`}
                          {g.removed_at && <em className="warn"> {o.name} took this off their list</em>}
                        </span>
                      </div>
                      {g.organizer_id === me.id ? (
                        <form action={toggleGroupPurchased}>
                          <input type="hidden" name="groupId" value={g.group_id} />
                          <SubmitButton className={`check${g.purchased ? ' on' : ''}`} pendingText="…" aria-pressed={g.purchased}>
                            {g.purchased ? 'Bought' : 'Mark bought'}
                          </SubmitButton>
                        </form>
                      ) : (
                        <span className={`check static${g.purchased ? ' on' : ''}`}>{g.purchased ? 'Bought' : 'Not yet'}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </main>
    </>
  );
}
