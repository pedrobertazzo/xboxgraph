'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadRecent, type Recent } from './Recent';

// The search in the top bar of profile and compare pages. Focusing it lists recently viewed players (each with a
// shortcut to compare with the player on screen); typing filters them, and Enter looks up whatever was typed.
export function TopSearch({ current }: { current?: { id: string; name: string } }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<Recent[]>([]);
  const router = useRouter();
  const box = useRef<HTMLFormElement>(null);
  const list = useId();

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const term = q.trim().toLowerCase();
  const rows = recent.filter((r) => r.id !== current?.id && (!term || r.name.toLowerCase().includes(term))).slice(0, 6);
  const show = open && rows.length > 0;
  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') return setOpen(false);
    if (!rows.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (e.key === 'ArrowDown' ? (i + 1) % rows.length : i <= 0 ? rows.length - 1 : i - 1));
    }
    if (e.key === 'Enter' && open && active >= 0 && rows[active]) {
      e.preventDefault();
      go(`/profile/${encodeURIComponent(rows[active].id)}`);
    }
  };

  return (
    <form ref={box} action="/api/search" method="get" className={'top-search' + (show ? ' open' : '')} role="search" onSubmit={() => setOpen(false)}>
      <input
        name="q"
        value={q}
        placeholder="Gamertag or link"
        aria-label="Gamertag or profile link"
        role="combobox"
        aria-expanded={show}
        aria-controls={list}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${list}-${active}` : undefined}
        required
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        onFocus={() => (setRecent(loadRecent()), setOpen(true))}
        onClick={() => setOpen(true)}
        onChange={(e) => (setQ(e.target.value), setActive(-1), setOpen(true))}
        onKeyDown={onKey}
      />
      <button type="submit" aria-label="Search">
        <svg viewBox="0 0 24 24" aria-hidden><path d="M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
      </button>
      {show && (
        <div className="ts-pop">
          <ul id={list} role="listbox" aria-label="Recently viewed players">
            <li className="ts-head" role="presentation">Recently viewed</li>
            {rows.map((r, i) => {
              const href = `/profile/${encodeURIComponent(r.id)}`;
              const cmp = current ? `/compare/${encodeURIComponent(current.id)}/${encodeURIComponent(r.id)}` : null;
              return (
                <li key={r.id} id={`${list}-${i}`} className={'ts-row' + (i === active ? ' on' : '')} role="option" aria-selected={i === active} onPointerEnter={() => setActive(i)}>
                  <a href={href} className="ts-who" tabIndex={-1} onClick={(e) => (e.preventDefault(), go(href))}>
                    {r.avatar ? <img src={r.avatar} alt="" /> : <span className="chip-ph" />}
                    <span className="ts-name">{r.name}</span>
                  </a>
                  {cmp && (
                    <a href={cmp} className="ts-cmp" tabIndex={-1} aria-label={`Compare ${current!.name} with ${r.name}`} onClick={(e) => (e.preventDefault(), go(cmp))}>
                      Compare
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </form>
  );
}
