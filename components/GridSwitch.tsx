'use client';

import { useEffect, useRef, useState } from 'react';

// The other grids, next to the logo in every header: inline on wide screens, a small menu on phones, where the search
// takes the room. Plain coloured dots rather than platform logos.
const UTM = 'utm_source=xbox.morphgrid.io&utm_medium=referral&utm_campaign=header';
const GRIDS = [
  { key: 'psn', label: 'PlayStation', url: `https://psn.morphgrid.io/?${UTM}` },
  { key: 'steam', label: 'Steam', url: `https://steam.morphgrid.io/?${UTM}` },
  { key: 'chess', label: 'Chess', url: `https://chess.morphgrid.io/?${UTM}` },
];

export function GridSwitch() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const links = GRIDS.map((g) => (
    <a key={g.key} href={g.url} className={`gs-link gs-${g.key}`}>
      <i aria-hidden />
      {g.label}
    </a>
  ));
  return (
    <div className="gs" ref={ref}>
      <nav className="gs-row" aria-label="Other My Gaming Grid sites">
        <span className="gs-link gs-xbox" aria-current="page">
          <i aria-hidden />
          Xbox
        </span>
        {links}
      </nav>
      <button type="button" className="gs-toggle" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        Grids
        <svg viewBox="0 0 12 12" aria-hidden>
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <nav className="gs-pop" aria-label="Other My Gaming Grid sites">
          <span className="gs-link gs-xbox" aria-current="page">
            <i aria-hidden />
            Xbox <small>you’re here</small>
          </span>
          {links}
        </nav>
      )}
    </div>
  );
}
