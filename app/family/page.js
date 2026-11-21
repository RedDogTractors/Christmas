import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { getFamilyOverview } from '@/lib/queries';
import Header from '@/components/Header';

export default async function FamilyPage() {
  const me = await requireUser();
  const people = await getFamilyOverview(me.id);

  return (
    <>
      <Header user={me} current="family" />
      <main className="page">
        <h1>Hi, {me.name}</h1>
        <p className="lede">Pick someone to see their list. Claimed gifts are hidden from the person they’re for.</p>

        {people.length === 0 ? (
          <div className="empty">
            <p>No one else has joined yet. Send the family the site link and the family code.</p>
          </div>
        ) : (
          <ul className="people">
            {people.map((p) => (
              <li key={p.id}>
                <Link href={`/person/${p.id}`} className="person">
                  <span className="person-name">{p.name}</span>
                  <span className="person-meta">
                    {p.item_count === 0
                      ? 'No list yet'
                      : p.open_count === 0
                        ? `All ${p.item_count} covered`
                        : `${p.open_count} of ${p.item_count} still open`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="aside"><Link href="/me">Add to your own list</Link></p>
      </main>
    </>
  );
}
