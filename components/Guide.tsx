'use client';

import { useEffect, useState } from 'react';

const KEY = 'mggp_guide_v1';

export function useFirstVisitGuide(): [boolean, (v: boolean) => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(KEY) === '1';
    } catch {}
    if (seen) return;
    const t = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(t);
  }, []);
  const set = (v: boolean) => {
    setOpen(v);
    if (!v)
      try {
        localStorage.setItem(KEY, '1');
      } catch {}
  };
  return [open, set];
}

function Demo() {
  return (
    <div className="demo" aria-hidden>
      <div className="demo-slot a">
        <span>Chart</span>
      </div>
      <div className="demo-slot b">
        <span>Highlight</span>
      </div>
      <div className="demo-card one">
        <b>Gamerscore</b>
        <div className="as-bars">
          <i style={{ width: '90%' }} />
          <i style={{ width: '55%' }} />
          <i style={{ width: '40%' }} />
        </div>
        <div className="as-number">12,430</div>
      </div>
      <div className="demo-card two">
        <b>Rarest</b>
        <div className="as-number">0.4%</div>
        <div className="as-bars">
          <i style={{ width: '35%' }} />
          <i style={{ width: '80%' }} />
          <i style={{ width: '60%' }} />
        </div>
      </div>
      <div className="demo-hand">
        <svg viewBox="0 0 24 24" width="26" height="26">
          <path d="M5 3l14 7-6 1.5L10 18z" fill="#fff" stroke="#1a1b1a" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

export function Guide({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box guide">
        <h2 id="guide-title">Make the dashboard yours</h2>
        <Demo />
        <ol className="guide-steps">
          <li>
            <b>Drag a card into another row.</b> Every row shows one card type, so the stat redraws itself to match: a
            chart can become a big number, a cover wall or a heatmap. Drop it on a card to swap the two.
          </li>
          <li className="wide-only">
            <b>‹ ›</b> on a card cycles through more stats, like Almost 100%, Finish rate and Gamerscore per hour.
          </li>
          <li>
            <b>⤢</b> opens the full details.<span className="wide-only"> With a keyboard, focus a card and use the arrow keys to move it.</span>
          </li>
          <li>
            <b>Edit layout</b> (top right) shows the tools. Rows are grouped into sections you can rename; drag a row or a
            whole section by its <b>⋮⋮</b> grip, or use <b>↑ ↓</b>. The menu on each row changes its card type; <b>− +</b> resize it
            (empty slots go first) and <b>×</b> removes it. While you drag a card, slots whose card type suits it light up.{' '}
            <b>Layout</b> switches to a
            ready-made design.
          </li>
          <li>
            <b>Share</b> sends your exact layout as a link, an image or a text summary.
          </li>
        </ol>
        <div className="guide-actions">
          <button type="button" className="btn primary" autoFocus onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}
