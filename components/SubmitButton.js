'use client';

import { useFormStatus } from 'react-dom';

export default function SubmitButton({ children, pendingText, className = 'btn', ...rest }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending} {...rest}>
      {pending ? pendingText || 'Saving…' : children}
    </button>
  );
}
