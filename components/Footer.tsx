import Link from 'next/link';
import { SISTER_SITES } from '@/lib/site';

export function Footer() {
  return (
    <footer className="foot">
      <nav className="foot-links">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy#opt-out">Opt out</Link>
      </nav>
      <nav className="foot-links foot-sisters" aria-label="More from My Gaming Grid">
        {SISTER_SITES.filter((s) => s.key !== 'xbox').map((s) => (
          <a key={s.key} href={s.url}>{s.label}</a>
        ))}
      </nav>
      <span className="foot-credit">
        Built on <a href="https://pedrobertazzo.github.io/morphgrid/" target="_blank" rel="noreferrer">morphgrid</a>, an open-source React grid.
      </span>
      Not affiliated with or endorsed by Microsoft. Xbox is a trademark of the Microsoft group of companies. Game names belong to their owners.
    </footer>
  );
}
