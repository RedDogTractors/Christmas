import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { LoginForm } from '@/components/AuthForms';
import Header from '@/components/Header';

export default async function Home() {
  if (await getCurrentUser()) redirect('/family');
  return (
    <>
      <Header />
      <main className="page narrow">
        <h1 className="hero">Make a list.<br />Keep the surprise.</h1>
        <p className="lede">
          Add what you’re hoping for. Claim gifts for everyone else. Nobody ever sees what’s been
          bought for them.
        </p>
        <section className="panel">
          <h2>Sign in</h2>
          <LoginForm />
        </section>
        <p className="aside">
          First time here? <Link href="/register">Create your account</Link> with the family code.
          <br />Forgot your PIN? Ask whoever set up the site to reset it.
        </p>
      </main>
    </>
  );
}
