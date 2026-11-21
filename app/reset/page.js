import Link from 'next/link';
import { ResetPinForm } from '@/components/AuthForms';
import Header from '@/components/Header';

export const metadata = { title: 'Reset a PIN · Wishbook' };

export default function ResetPage() {
  return (
    <>
      <Header />
      <main className="page narrow">
        <h1>Reset a PIN</h1>
        <p className="lede">For the site organizer. Needs the admin code.</p>
        <section className="panel">
          <ResetPinForm />
        </section>
        <p className="aside"><Link href="/">Back to sign in</Link></p>
      </main>
    </>
  );
}
