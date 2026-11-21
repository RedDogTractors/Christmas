import Link from 'next/link';
import { logout } from '@/app/actions';

export default function Header({ user, current }) {
  const links = [
    ['/family', 'Family', 'family'],
    ['/me', 'My list', 'me'],
    ['/shopping', 'My shopping', 'shopping'],
  ];
  return (
    <header className="site-header">
      <Link href={user ? '/family' : '/'} className="wordmark">Wishbook</Link>
      {user && (
        <nav aria-label="Main">
          {links.map(([href, label, key]) => (
            <Link key={key} href={href} aria-current={current === key ? 'page' : undefined}>{label}</Link>
          ))}
          <form action={logout}>
            <button type="submit" className="link-btn" title={`Signed in as ${user.name}`}>Sign out</button>
          </form>
        </nav>
      )}
    </header>
  );
}
