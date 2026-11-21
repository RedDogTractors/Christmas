'use client';

import { useEffect, useRef } from 'react';
import { useFormState } from 'react-dom';
import { saveItem } from '@/app/actions';
import SubmitButton from './SubmitButton';

export default function ItemForm({ item }) {
  const [state, action] = useFormState(saveItem, null);
  const formRef = useRef(null);
  const editing = Boolean(item);

  useEffect(() => {
    if (state?.ok && !editing) formRef.current?.reset();
  }, [state, editing]);

  return (
    <form ref={formRef} action={action} className="item-form">
      {editing && <input type="hidden" name="id" value={item.id} />}
      <label className="span-2">
        What would you like?
        <input name="name" maxLength={120} required defaultValue={item?.name || ''} />
      </label>
      <label className="span-2">
        Link <span className="optional">(optional)</span>
        <input name="url" inputMode="url" placeholder="Paste a store link" defaultValue={item?.url || ''} />
      </label>
      <label>
        Price <span className="optional">(optional)</span>
        <input name="price" inputMode="decimal" placeholder="0.00" defaultValue={item?.price ?? ''} />
      </label>
      <label>
        How many?
        <input name="quantity" type="number" min={1} max={99} defaultValue={item?.quantity ?? 1} required />
      </label>
      <label className="span-2">
        Notes <span className="optional">(size, color, where to find it)</span>
        <textarea name="notes" rows={2} maxLength={500} defaultValue={item?.notes || ''} />
      </label>
      <div className="span-2 form-foot">
        <SubmitButton pendingText={editing ? 'Saving…' : 'Adding…'}>
          {editing ? 'Save changes' : 'Add to my list'}
        </SubmitButton>
        {state?.error && <p className="msg error" role="alert">{state.error}</p>}
        {state?.ok && <p className="msg ok" role="status">{state.ok}</p>}
      </div>
    </form>
  );
}
