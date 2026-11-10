import { Logo } from '@/components/Logo';

// Shown while the players load; each takes a few Xbox requests.
export default function Loading() {
  return (
    <>
      <nav className="topbar"><Logo /></nav>
      <main className="dash compare" aria-busy="true">
        <p className="cmp-loading" role="status">
          <span className="cmp-spin" aria-hidden />
          Loading players from Xbox…
        </p>
      </main>
    </>
  );
}
