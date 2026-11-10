'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export type Recent = { id: string; name: string; avatar: string | null };
const KEY = 'mggp_recent';
const MAX = 6;

export function loadRecent(): Recent[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => x && typeof x.id === 'string' && typeof x.name === 'string') : [];
  } catch {
    return [];
  }
}

export function RememberProfile(p: Recent) {
  useEffect(() => {
    try {
      const next = [p, ...loadRecent().filter((x) => x.id !== p.id)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }, [p.id, p.name, p.avatar]);
  return null;
}

export function RecentProfiles() {
  const [list, setList] = useState<Recent[]>([]);
  useEffect(() => setList(loadRecent()), []);
  if (!list.length) return null;
  return (
    <div className="recent">
      <span>Recently viewed</span>
      <ul>
        {list.map((r) => (
          <li key={r.id}>
            <Link href={`/profile/${encodeURIComponent(r.id)}`} className="chip">
              {r.avatar ? <img src={r.avatar} alt="" /> : <span className="chip-ph" />}
              {r.name}
            </Link>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="chip-clear"
        onClick={() => {
          try {
            localStorage.removeItem(KEY);
          } catch {}
          setList([]);
        }}
      >
        Clear
      </button>
    </div>
  );
}
