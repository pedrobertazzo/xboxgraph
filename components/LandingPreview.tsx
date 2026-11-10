'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { allRows, fillRows, placeItem, RowGrid, type Assignment, type RowLayoutOptions } from 'morphgrid';
import { NARROW_HEIGHT, NARROW_PER_LINE, ROW_HEIGHT, VIEW_KEYS, type DashSection } from '@/lib/presets';
import type { Stat } from '@/lib/types';
import { CardChrome, VIEWS, VIEW_LABELS, type View } from './views';

const ROW_LAYOUT: RowLayoutOptions<View> = {
  columns: 12,
  height: (v) => ROW_HEIGHT[v],
  narrow: { maxWidth: 720, columns: 2, perLine: NARROW_PER_LINE, height: (v) => NARROW_HEIGHT[v] },
};

// Two rows of sample cards: headline numbers, then lists. Dragging a card into the other row redraws it as that row's
// card type, the same as on a real dashboard.
const SECTIONS: DashSection[] = [
  {
    id: 's0',
    title: '',
    rows: [
      { id: 'r0', view: 'highlight', slots: 3 },
      { id: 'r1', view: 'toplist', slots: 2 },
    ],
  },
];
const START = fillRows(allRows(SECTIONS), [['gamerscore', 'rarest', 'finishrate'], ['almost', 'completed']]);

// A short script the board plays while nobody touches it, like the morphgrid.io hero: each step drops a card into
// the other row, where it redraws, and the next step puts it back.
const SCRIPT: [string, string][] = [
  ['gamerscore', 'r1-0'],
  ['gamerscore', 'r0-0'],
  ['completed', 'r0-1'],
  ['completed', 'r1-1'],
  ['finishrate', 'r1-0'],
  ['finishrate', 'r0-2'],
];
const STEP_MS = 2600;

export function LandingPreview({ stats }: { stats: Stat[] }) {
  const [layout, setLayout] = useState<Assignment>(START);
  const [sections, setSections] = useState(SECTIONS);
  const [status, setStatus] = useState('');
  // Plays until someone hovers or focuses the board (a pause), or moves a card themselves (it stops for good).
  const [auto, setAuto] = useState(true);
  const [hover, setHover] = useState(false);
  const step = useRef(0);
  const current = useRef(layout);
  current.current = layout;
  useEffect(() => {
    if (!auto || hover || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => {
      if (document.hidden) return;
      const [item, cell] = SCRIPT[step.current++ % SCRIPT.length];
      const next = placeItem(current.current, item, cell);
      if (next) setLayout(next);
    }, STEP_MS);
    return () => clearInterval(t);
  }, [auto, hover]);
  return (
    <section className="preview" aria-label="Example dashboard">
      <div className="preview-frame">
      <div className="preview-inner">
      <div className="preview-head">
        <p className="preview-hint">
          {auto ? (
            <>
              <span className={'preview-live' + (hover ? ' paused' : '')}>{hover ? 'Paused' : 'Playing'}</span>
              Cards from a sample profile move between rows and redraw to fit. Grab one to try it yourself.
            </>
          ) : (
            'Your turn: drag a card into the other row and watch it redraw.'
          )}
        </p>
        <Link className="btn ghost preview-more" href="/profile/sample">See the full sample →</Link>
      </div>
      <p className="sr-only" aria-live="polite">{status}</p>
        <div onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}>
        <RowGrid<Stat, View>
          className="stat-grid preview-grid"
          sections={sections}
          onSectionsChange={setSections}
          editing={false}
          rowLayout={ROW_LAYOUT}
          viewOrder={VIEW_KEYS}
          items={stats}
          getItemId={(s) => s.key}
          getItemLabel={(s) => s.title}
          views={VIEWS}
          viewLabels={VIEW_LABELS}
          value={layout}
          onChange={(next) => {
            setLayout({ ...next });
            setAuto(false);
          }}
          chrome={CardChrome}
          renderHeader={() => null}
          renderSection={() => null}
          labels={{ cycle: 'swap', cyclePrev: 'Previous stat', cycleNext: 'Next stat' }}
          onAnnounce={setStatus}
          onOpen={() => (location.href = '/profile/sample')}
        />
        </div>
      </div>
      </div>
    </section>
  );
}
