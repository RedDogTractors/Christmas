import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { getListForGiver } from '@/lib/queries';
import { money, num } from '@/lib/format';
import { setClaim, startGroup, joinGroup, leaveGroup } from '@/app/actions';
import Header from '@/components/Header';
import SubmitButton from '@/components/SubmitButton';

export default async function PersonPage({ params }) {
  const me = await requireUser();
  const ownerId = Number.parseInt(params.id, 10);
  if (!Number.isInteger(ownerId)) notFound();
  // Never show anyone the claim status of their own list.
  if (ownerId === me.id) redirect('/me');

  const owner = (await sql`SELECT id, name FROM users WHERE id = ${ownerId}`)[0];
  if (!owner) notFound();
  const items = await getListForGiver(ownerId, me.id);

  return (
    <>
      <Header user={me} current="family" />
      <main className="page">
        <p className="crumb"><Link href="/family">Family</Link></p>
        <h1>{owner.name}’s list</h1>
        <p className="lede">{owner.name} can’t see any of the claims below.</p>

        {items.length === 0 ? (
          <div className="empty"><p>{owner.name} hasn’t added anything yet. Check back closer to Christmas.</p></div>
        ) : (
          <ul className="tags">
            {items.map((item) => <GiftTag key={item.id} item={item} meId={me.id} />)}
          </ul>
        )}
      </main>
    </>
  );
}

function GiftTag({ item, meId }) {
  const covered = item.remaining === 0;
  const myQty = item.myClaim?.quantity || 0;
  const maxForMe = item.remaining + myQty;
  const canStartGroup = item.remaining > 0;

  return (
    <li className={`tag${covered ? ' covered' : ''}`}>
      <div className="tag-body">
        <div className="tag-head">
          <h3 className="tag-title">
            {item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer">{item.name}</a> : item.name}
          </h3>
          {covered && <span className="stamp">Covered</span>}
        </div>
        <p className="tag-facts">
          {item.price !== null && <span>{money(item.price)}</span>}
          {item.quantity > 1 && <span>Wants {item.quantity}</span>}
          {!covered && item.quantity > 1 && <span className="open">{item.remaining} still needed</span>}
        </p>
        {item.notes && <p className="tag-notes">{item.notes}</p>}

        {(item.claims.length > 0 || item.groups.length > 0) && (
          <ul className="who">
            {item.claims.map((c) => (
              <li key={`c${c.user_id}`}>
                {c.user_id === meId ? 'You’re' : `${c.name} is`} getting {c.quantity === 1 && item.quantity === 1 ? 'this' : c.quantity}
                {c.purchased && <span className="bought">bought</span>}
              </li>
            ))}
            {item.groups.map((g) => (
              <li key={`g${g.id}`}>
                Group gift organized by {g.organizer_id === meId ? 'you' : g.organizer_name}
                {g.purchased && <span className="bought">bought</span>}
                <span className="group-line">
                  {g.members.map((m) => `${m.user_id === meId ? 'You' : m.name}${num(m.amount) !== null ? ` ${money(m.amount)}` : ''}`).join(', ')}
                  {item.price !== null && `. ${money(g.pledged)} of ${money(item.price)} pledged`}
                  {item.price === null && g.pledged > 0 && `. ${money(g.pledged)} pledged`}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="actions">
          {item.myClaim ? (
            <div className="action-row">
              {maxForMe > 1 && (
                <form action={setClaim} className="inline-form">
                  <input type="hidden" name="itemId" value={item.id} />
                  <label className="qty">
                    How many
                    <input name="quantity" type="number" min={1} max={maxForMe} defaultValue={myQty} />
                  </label>
                  <SubmitButton className="btn ghost">Update</SubmitButton>
                </form>
              )}
              <form action={setClaim}>
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="quantity" value="0" />
                <SubmitButton className="btn ghost" pendingText="Releasing…">Release my claim</SubmitButton>
              </form>
            </div>
          ) : item.remaining > 0 ? (
            <form action={setClaim} className="inline-form">
              <input type="hidden" name="itemId" value={item.id} />
              {item.remaining > 1 ? (
                <label className="qty">
                  How many
                  <input name="quantity" type="number" min={1} max={item.remaining} defaultValue={1} />
                </label>
              ) : (
                <input type="hidden" name="quantity" value="1" />
              )}
              <SubmitButton pendingText="Claiming…">I’ll get this</SubmitButton>
            </form>
          ) : null}

          {item.groups.map((g) => (
            <form key={g.id} action={joinGroup} className="inline-form">
              <input type="hidden" name="groupId" value={g.id} />
              <label className="qty">
                {g.isMember ? 'Your share' : `Chip in with ${g.organizer_id === meId ? 'your' : `${g.organizer_name}’s`} group`}
                <input name="amount" inputMode="decimal" placeholder="$ amount (optional)" defaultValue={g.myAmount ?? ''} />
              </label>
              <SubmitButton className="btn ghost">{g.isMember ? 'Update share' : 'Join group'}</SubmitButton>
              {g.isMember && (
                <SubmitButton className="btn ghost" formAction={leaveGroup} pendingText="Leaving…">Leave group</SubmitButton>
              )}
            </form>
          ))}

          {canStartGroup && (
            <details className="split">
              <summary>Split it with others</summary>
              <form action={startGroup} className="inline-form">
                <input type="hidden" name="itemId" value={item.id} />
                <label className="qty">
                  Your share
                  <input name="amount" inputMode="decimal" placeholder="$ amount (optional)" />
                </label>
                <SubmitButton pendingText="Starting…">Start a group gift</SubmitButton>
              </form>
              <p className="hint">Reserves one of these for the group. Others can join from this page.</p>
            </details>
          )}
        </div>
      </div>
    </li>
  );
}
