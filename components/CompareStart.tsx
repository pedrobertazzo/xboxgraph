'use client';

import { useEffect, useRef, useState } from 'react';
import { loadRecent, type Recent } from './Recent';

// Two to four boxes for gamertags, and recently viewed players to drop into the next empty one.
export function CompareStart({ initial, error }: { initial: string[]; error?: string }) {
  const [values, setValues] = useState(() => Array.from({ length: Math.max(2, Math.min(4, initial.length)) }, (_, i) => initial[i] ?? ''));
  const [recent, setRecent] = useState<Recent[]>([]);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => setRecent(loadRecent()), []);
  const set = (i: number, v: string) => setValues((xs) => xs.map((x, j) => (j === i ? v : x)));
  const add = (name: string) =>
    setValues((xs) => {
      if (xs.some((x) => x.toLowerCase() === name.toLowerCase())) return xs;
      const at = xs.findIndex((x) => !x.trim());
      if (at >= 0) return xs.map((x, j) => (j === at ? name : x));
      return xs.length < 4 ? [...xs, name] : xs;
    });
  return (
    <form ref={form} action="/api/compare" method="get" className="start-opt search compare-start">
      <h2>Players to compare</h2>
      <div className="cmp-inputs">
        {values.map((v, i) => (
          <div key={i} className="cmp-input">
            <span className={`cmp-dot p${i}`} aria-hidden />
            <input name="p" value={v} onChange={(e) => set(i, e.target.value)} placeholder={i < 2 ? 'Gamertag or profile link' : 'Optional'} aria-label={`Player ${i + 1}`} required={i < 2} autoComplete="off" autoCapitalize="off" spellCheck={false} />
            {i >= 2 && (
              <button type="button" className="cmp-remove" aria-label={`Remove player ${i + 1}`} onClick={() => setValues((xs) => xs.filter((_, j) => j !== i))}>
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="cmp-actions">
        {values.length < 4 && (
          <button type="button" className="btn ghost small" onClick={() => setValues((xs) => [...xs, ''])}>
            + Add a player
          </button>
        )}
        <button type="submit" className="btn primary">Compare</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {recent.length > 0 && (
        <div className="recent cmp-recent">
          <span>Recently viewed</span>
          <ul>
            {recent.map((r) => (
              <li key={r.id}>
                <button type="button" className="chip" onClick={() => add(r.name)}>
                  {r.avatar ? <img src={r.avatar} alt="" /> : <span className="chip-ph" />}
                  {r.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
