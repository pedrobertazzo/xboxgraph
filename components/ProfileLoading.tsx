'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Footer } from './Footer';
import { Logo } from './Logo';
import { loadRecent, type Recent } from './Recent';
import { TopSearch } from './TopSearch';

// One card's possible looks while the profile loads, the same card types the board uses. Each ghost card cycles
// through all of them, offset from its neighbours, so the grid keeps morphing like a rearranged board.
function Glyphs() {
  return (
    <>
      <div className="lg-g lg-bars">
        {[0.55, 0.85, 0.4, 1, 0.7].map((h, i) => (
          <i key={i} style={{ ['--h' as string]: h, ['--i' as string]: i }} />
        ))}
      </div>
      <div className="lg-g lg-num">
        <b />
        <span />
        <span className="short" />
      </div>
      <div className="lg-g lg-clock">
        <i className="face" />
        <i className="hand" />
      </div>
      <div className="lg-g lg-cal">
        {Array.from({ length: 63 }, (_, i) => (
          <i key={i} style={{ ['--i' as string]: i, ['--l' as string]: (i * 7919) % 5 }} />
        ))}
      </div>
      <div className="lg-g lg-wall">
        {[0, 1, 2, 3].map((i) => (
          <i key={i} style={{ ['--i' as string]: i }} />
        ))}
      </div>
      <div className="lg-g lg-list">
        {[0, 1, 2, 3].map((i) => (
          <p key={i} style={{ ['--i' as string]: i }}>
            <i />
            <span />
          </p>
        ))}
      </div>
    </>
  );
}

// Three rows of ghost cards. Each row's cards trade width back and forth, so they glide like cards changing slots.
const ROWS = [3, 2, 4];

// What a new profile waits on, lit one after another while Xbox answers.
const STEPS = ['Profile', 'Games', 'Play time', 'Achievements', 'Rarity'];

export function ProfileLoading() {
  const { id: raw } = useParams<{ id?: string }>();
  const id = raw ? decodeURIComponent(raw).toLowerCase() : undefined;
  // Profiles seen before are remembered in this browser, so their name and avatar can show before Xbox answers.
  const [known, setKnown] = useState<Recent | null>(null);
  useEffect(() => setKnown(loadRecent().find((r) => r.id === id) ?? null), [id]);
  let card = 0;
  return (
    <>
      <nav className="topbar">
        <Logo />
        <span className="topbar-end">
          <TopSearch />
        </span>
      </nav>
      <main className="dash lg" aria-busy="true">
        <header className="profile lg-head">
          <div className="lg-avatar" aria-hidden>
            {known?.avatar ? <img src={known.avatar} alt="" /> : <i />}
          </div>
          <div className="who">
            <h1>{known?.name ?? (id === 'sample' ? 'Sample profile' : id ?? 'Xbox profile')}</h1>
            <p className="lg-steps" role="status">
              <span className="sr-only">Loading this profile from Xbox…</span>
              {STEPS.map((s, i) => (
                <span key={s} style={{ ['--i' as string]: i }} aria-hidden>
                  {s}
                </span>
              ))}
            </p>
          </div>
        </header>
        <div className="lg-grid" aria-hidden>
          {ROWS.map((n, r) => (
            <div key={r} className="lg-row" style={{ ['--n' as string]: n }}>
              {Array.from({ length: n }, (_, i) => {
                const k = card++;
                return (
                  <div key={i} className="lg-card" style={{ ['--k' as string]: k, ['--j' as string]: i }}>
                    <div className="lg-top">
                      <i />
                      <span />
                    </div>
                    <div className="lg-body">
                      <Glyphs />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
