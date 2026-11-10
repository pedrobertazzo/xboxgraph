import Link from 'next/link';
import { Footer } from './Footer';
import { Logo } from './Logo';

export function OptedOut() {
  return (
    <>
      <nav className="topbar">
        <Logo />
      </nav>
      <main className="landing">
        <section className="hero notice">
          <h1>This player opted out</h1>
          <p className="lede">At this player’s request, My Gaming Grid doesn’t show stats for this Xbox profile.</p>
          <div className="actions">
            <Link className="btn ghost" href="/">Back to search</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
