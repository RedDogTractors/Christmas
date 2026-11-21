'use client';

import { useFormState } from 'react-dom';
import { login, register, resetPin, changePin } from '@/app/actions';
import SubmitButton from './SubmitButton';

function Message({ state }) {
  if (state?.error) return <p className="msg error" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="msg ok" role="status">{state.ok}</p>;
  return null;
}

const pinProps = { inputMode: 'numeric', pattern: '[0-9]{4,8}', minLength: 4, maxLength: 8, required: true };

export function LoginForm() {
  const [state, action] = useFormState(login, null);
  return (
    <form action={action} className="stack">
      <label>Your name<input name="name" autoComplete="username" required /></label>
      <label>PIN<input name="pin" type="password" autoComplete="current-password" {...pinProps} /></label>
      <Message state={state} />
      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useFormState(register, null);
  return (
    <form action={action} className="stack">
      <label>Family code<input name="code" autoComplete="off" required /></label>
      <label>
        Your name
        <input name="name" maxLength={40} autoComplete="username" required />
        <span className="hint">How the family knows you, like “Grandma Jo” or “Ben R.”</span>
      </label>
      <label>Choose a PIN (4–8 digits)<input name="pin" type="password" autoComplete="new-password" {...pinProps} /></label>
      <label>Type the PIN again<input name="pin2" type="password" autoComplete="new-password" {...pinProps} /></label>
      <Message state={state} />
      <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
    </form>
  );
}

export function ResetPinForm() {
  const [state, action] = useFormState(resetPin, null);
  return (
    <form action={action} className="stack">
      <label>Admin code<input name="admin" type="password" autoComplete="off" required /></label>
      <label>Name of the person<input name="name" required /></label>
      <label>New PIN<input name="pin" type="password" autoComplete="new-password" {...pinProps} /></label>
      <label>Type the new PIN again<input name="pin2" type="password" autoComplete="new-password" {...pinProps} /></label>
      <Message state={state} />
      <SubmitButton pendingText="Resetting…">Reset PIN</SubmitButton>
    </form>
  );
}

export function ChangePinForm() {
  const [state, action] = useFormState(changePin, null);
  return (
    <form action={action} className="stack">
      <label>Current PIN<input name="current" type="password" autoComplete="current-password" {...pinProps} /></label>
      <label>New PIN<input name="pin" type="password" autoComplete="new-password" {...pinProps} /></label>
      <label>Type the new PIN again<input name="pin2" type="password" autoComplete="new-password" {...pinProps} /></label>
      <Message state={state} />
      <SubmitButton pendingText="Changing…">Change PIN</SubmitButton>
    </form>
  );
}
