'use client';

import { useEffect, useState } from 'react';
import type { Match } from '@/lib/elsewhere';

const KEY = 'mggp_also_hidden';

const hidden = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

// One quiet line under the board when the same name is on Steam, Chess.com or Lichess, linking to that player's grid
// there. Nothing shows when there's no match. It's only a name match, so it says "called", never "your". Hidden for
// that name once dismissed.
export function AlsoOn({ name }: { name: string }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [gone, setGone] = useState(false);
  const id = name.toLowerCase();

  useEffect(() => {
    if (hidden().includes(id)) return;
    const ctl = new AbortController();
    fetch(`/api/elsewhere?name=${encodeURIComponent(name)}`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : { matches: [] }))
      .then((j: { matches?: Match[] }) => setMatches(j.matches ?? []))
      .catch(() => {});
    return () => ctl.abort();
  }, [id, name]);

  if (gone || !matches.length) return null;
  const hide = () => {
    setGone(true);
    try {
      localStorage.setItem(KEY, JSON.stringify([id, ...hidden().filter((x) => x !== id)].slice(0, 50)));
    } catch {}
  };

  return (
    <p className="note also-on">
      <span>
        There’s also{' '}
        {matches.map((m, i) => (
          <span key={m.site}>
            {i > 0 && (i === matches.length - 1 ? ' and ' : ', ')}
            a{' '}
            <a href={m.url}>
              {m.label} {m.site === 'steam' ? 'profile' : 'account'}
            </a>
          </span>
        ))}{' '}
        called <b>{name}</b>. See {matches.length === 1 ? 'its' : 'their'} grid{matches.length === 1 ? '' : 's'} on My Gaming Grid.
      </span>
      <button type="button" className="also-x" onClick={hide} aria-label="Hide this">
        ×
      </button>
    </p>
  );
}
