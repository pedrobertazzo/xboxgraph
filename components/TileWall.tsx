'use client';

import { useEffect, useState } from 'react';

export type WallTile = { src: string; label: string };

// A tilted wall of game covers that drifts slowly, like a console's home screen, with one tile at a time lifted and
// lit with a white border. `still` keeps the focus on one tile (the profile banner).
export function TileWall({ tiles, className, still }: { tiles: WallTile[]; className?: string; still?: boolean }) {
  const slots = 24;
  const list = tiles.length ? Array.from({ length: slots }, (_, i) => tiles[i % tiles.length]) : [];
  const [on, setOn] = useState(8);
  useEffect(() => {
    if (still || list.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Hop around the middle of the wall, where the tiles are in view.
    const path = [8, 9, 15, 14, 7, 13, 20, 8, 2, 9, 16, 10];
    let k = 0;
    const t = setInterval(() => !document.hidden && setOn(path[++k % path.length]), 2400);
    return () => clearInterval(t);
  }, [still, list.length]);
  if (!list.length) return null;
  return (
    <div className={'tile-wall' + (className ? ' ' + className : '')} aria-hidden>
      <div className="tw-plane">
        {list.map((t, i) => (
          <span key={i} className={'tw-tile' + (i === on ? ' on' : '')}>
            <img src={t.src} alt="" loading="lazy" />
          </span>
        ))}
      </div>
    </div>
  );
}
