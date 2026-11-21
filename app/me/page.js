import { requireUser } from '@/lib/auth';
import { getOwnList } from '@/lib/queries';
import { money, num } from '@/lib/format';
import { removeItem } from '@/app/actions';
import Header from '@/components/Header';
import ItemForm from '@/components/ItemForm';
import SubmitButton from '@/components/SubmitButton';
import { ChangePinForm } from '@/components/AuthForms';

export default async function MyListPage() {
  const me = await requireUser();
  const items = (await getOwnList(me.id)).map((i) => ({ ...i, price: num(i.price) }));

  return (
    <>
      <Header user={me} current="me" />
      <main className="page">
        <h1>Your wish list</h1>
        <p className="lede">
          Everyone else can see this list and claim things from it. You won’t see what’s been
          claimed, so the surprise holds.
        </p>

        <section className="panel">
          <h2>Add a gift idea</h2>
          <ItemForm />
        </section>

        {items.length === 0 ? (
          <div className="empty"><p>Your list is empty. Add the first thing you’re hoping for above.</p></div>
        ) : (
          <ul className="tags">
            {items.map((item) => (
              <li key={item.id} className="tag">
                <div className="tag-body">
                  <h3 className="tag-title">
                    {item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer">{item.name}</a> : item.name}
                  </h3>
                  <p className="tag-facts">
                    {item.price !== null && <span>{money(item.price)}</span>}
                    {item.quantity > 1 && <span>Wants {item.quantity}</span>}
                  </p>
                  {item.notes && <p className="tag-notes">{item.notes}</p>}
                  <details className="tag-edit">
                    <summary>Edit</summary>
                    <ItemForm item={item} />
                    <form action={removeItem} className="remove-form">
                      <input type="hidden" name="id" value={item.id} />
                      <SubmitButton className="btn ghost danger" pendingText="Removing…">Remove from my list</SubmitButton>
                    </form>
                  </details>
                </div>
              </li>
            ))}
          </ul>
        )}

        <details className="panel settings">
          <summary>Change your PIN</summary>
          <ChangePinForm />
        </details>
      </main>
    </>
  );
}
