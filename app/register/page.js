import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { RegisterForm } from '@/components/AuthForms';
import Header from '@/components/Header';

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect('/family');
  return (
    <>
      <Header />
      <main className="page narrow">
        <h1>Join the family list</h1>
        <p className="lede">You’ll need the family code. You only enter it once.</p>
        <section className="panel">
          <RegisterForm />
        </section>
        <p className="aside">Already signed up? <Link href="/">Sign in</Link></p>
      </main>
    </>
  );
}
