'use client';

import { useEffect, useState } from 'react';
import { Medal } from './Medal';

export type ToastItem = { name: string; score: number; game: string; rare: boolean };

// The landing hero's "achievement unlocked" pop-up: a coin pops in, the pill slides open with the achievement, then
// folds away and the next one comes. Drawn for this site, in its own colours.
export function AchievementToasts({ items }: { items: ToastItem[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (items.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => !document.hidden && setI((n) => (n + 1) % items.length), 4200);
    return () => clearInterval(t);
  }, [items.length]);
  const it = items[i];
  if (!it) return null;
  return (
    <div className="toast-stage" aria-hidden>
      <div key={i} className={'toast' + (it.rare ? ' rare' : '')}>
        <span className="toast-coin">
          <Medal kind={it.rare ? 'rare' : 'score'} />
        </span>
        <span className="toast-text">
          <small>{it.rare ? 'Rare achievement unlocked' : 'Achievement unlocked'}</small>
          <b>
            {it.score}G · {it.name}
          </b>
          <em>{it.game}</em>
        </span>
      </div>
    </div>
  );
}
