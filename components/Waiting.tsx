'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Counts down to when Xbox lookups should have room again, then asks the server for the page afresh. If there's still no
// room, the server answers with a later time and the count starts over; if the time has already passed, it tries again
// in 20 seconds.
export function useRetry(retryAt: number) {
  const router = useRouter();
  // Null until the page is in the browser, so the server and the browser draw the same first frame.
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const due = Math.max(retryAt, Date.now() + 20_000);
    const tick = () => setLeft(Math.max(0, Math.ceil((due - Date.now()) / 1000)));
    tick();
    const t = setInterval(() => {
      tick();
      if (Date.now() >= due) {
        clearInterval(t);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [retryAt, router]);
  return left;
}

// The waiting card shown instead of an error when a new profile can't be read yet.
export function WaitingCard({ name, retryAt }: { name: string; retryAt: number }) {
  const left = useRetry(retryAt);
  const [total, setTotal] = useState(1);
  useEffect(() => setTotal(Math.max(1, Math.ceil((retryAt - Date.now()) / 1000))), [retryAt]);
  return (
    <div className="waiting" role="status" aria-live="polite">
      <div className="waiting-ring" aria-hidden>
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" className="ring-back" />
          <circle cx="50" cy="50" r="44" className="ring" pathLength={100} strokeDasharray={`${left == null ? 0 : Math.min(100, (1 - left / total) * 100)} 100`} transform="rotate(-90 50 50)" />
        </svg>
        <b>{left ? clock(left) : '…'}</b>
      </div>
      <div className="waiting-text">
        <h1>Fetching {name}…</h1>
        <p className="lede">
          So many players are being looked up right now that we’ve used this hour’s Xbox requests. {name}’s dashboard opens here on its own
          {left ? <> in about <b>{Math.max(1, Math.round(left / 60))} min</b></> : ' as soon as there’s room'}. No need to reload.
        </p>
      </div>
    </div>
  );
}

// Refreshes a saved (stale) profile once Xbox lookups have room again.
export function StaleRefresh({ retryAt }: { retryAt: number }) {
  useRetry(retryAt);
  return null;
}
