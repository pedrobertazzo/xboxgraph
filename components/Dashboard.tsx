'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DefaultSectionHeader, DefaultSlot, RowGrid, type RowLayoutOptions } from 'morphgrid';
import { dashQuery, matchPreset, presetBoard, suits, type Assignment, type Clock, type DashState } from '@/lib/layout';
import { MAX_ROWS, MAX_SECTIONS, MAX_SLOTS, NARROW_HEIGHT, NARROW_PER_LINE, PRESETS, ROW_HEIGHT, VIEW_KEYS, presetById, type DashSection } from '@/lib/presets';
import type { Stat } from '@/lib/types';
import { Guide, useFirstVisitGuide } from './Guide';
import { SharePanel } from './SharePanel';
import { FitImg } from './FitImg';
import { StatIcon } from './StatIcon';
import { CardChrome, RowHeader, VIEWS, VIEW_LABELS, Img, type View } from './views';

const ROW_LAYOUT: RowLayoutOptions<View> = {
  columns: 12,
  height: (v) => ROW_HEIGHT[v],
  narrow: { maxWidth: 720, columns: 2, perLine: NARROW_PER_LINE, height: (v) => NARROW_HEIGHT[v] },
};

export function Dashboard({
  stats,
  clock: rendered,
  initialState,
  share,
  details = {},
}: {
  stats: Stat[];
  clock: Clock;
  initialState: DashState;
  share: { pageUrl: string; cardUrl: string; name: string } | null;
  // A fuller view for a stat's ⤢ details, in place of its list (the Backlog's sortable, filterable list).
  details?: Record<string, React.ReactNode>;
}) {
  const [sections, setSections] = useState<DashSection[]>(initialState.sections);
  const [layout, setLayout] = useState<Assignment>(initialState.layout);
  const [editing, setEditing] = useState(false);
  const statKeys = stats.map((s) => s.key).join('|');
  const keys = useMemo(() => statKeys.split('|'), [statKeys]);
  const presetId = useMemo(() => matchPreset({ sections, layout }, keys), [sections, layout, keys]);
  const router = useRouter();
  const [clock, setClock] = useState(rendered);
  // The viewer's clock goes into shared links and the share image; the server reads it from cookies set here.
  useEffect(() => {
    const local: Clock = {
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      h12: new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 ?? true,
    };
    const year = 'path=/; max-age=31536000; samesite=lax';
    document.cookie = `tz=${local.tz}; ${year}`;
    document.cookie = `hc=${local.h12 ? 12 : 24}; ${year}`;
    if (local.tz !== rendered.tz || local.h12 !== rendered.h12) {
      setClock(local);
      // Time-of-day stats are worked out on the server; redraw them on this viewer's clock (the profile is cached).
      router.refresh();
    }
  }, [rendered, router]);
  const [status, setStatus] = useState('Each row shows one card type. Drag a card into another row and it takes that row’s type.');
  const [guide, setGuide] = useFirstVisitGuide();

  const query = dashQuery({ sections, layout }, keys).toString();
  useEffect(() => {
    try {
      const url = new URL(location.href);
      for (const k of ['p', 'r', 'n', 'l']) url.searchParams.delete(k);
      new URLSearchParams(query).forEach((v, k) => url.searchParams.set(k, v));
      history.replaceState(null, '', url);
    } catch {}
  }, [query]);

  const changePreset = (id: string) => {
    const preset = presetById(id);
    const next = presetBoard(preset, keys);
    setSections(next.sections);
    setLayout(next.layout);
    setStatus(`Layout: ${preset.name}. ${preset.description}`);
  };
  const [open, setOpen] = useState<Stat | null>(null);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, [open]);

  return (
    <>
      <div className="dash-bar">
        <p className="status" aria-hidden>{status}</p>
        <div className="dash-tools">
          <label className="preset-pick">
            <span>Layout</span>
            <select value={presetId ?? ''} onChange={(e) => e.target.value && changePreset(e.target.value)} aria-label="Layout preset">
              {!presetId && <option value="">Custom</option>}
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <button type="button" className={'btn small' + (editing ? '' : ' ghost')} aria-pressed={editing} onClick={() => setEditing(!editing)}>
            {editing ? 'Done' : 'Edit layout'}
          </button>
          <button type="button" className="btn ghost small" onClick={() => setGuide(true)} aria-label="How it works">?</button>
          {share && <SharePanel {...share} query={query} clock={clock} stats={stats} />}
        </div>
      </div>
      <RowGrid<Stat, View>
        className="stat-grid"
        sections={sections}
        onSectionsChange={setSections}
        editing={editing}
        maxRows={MAX_ROWS}
        rowLayout={ROW_LAYOUT}
        viewOrder={VIEW_KEYS}
        maxSlots={MAX_SLOTS}
        items={stats}
        getItemId={(s) => s.key}
        getItemLabel={(s) => s.title}
        views={VIEWS}
        viewLabels={VIEW_LABELS}
        value={layout}
        onChange={(next) => setLayout({ ...next })}
        chrome={CardChrome}
        renderHeader={(h) => <RowHeader {...h} />}
        renderSection={(h) => <DefaultSectionHeader {...h} />}
        renderFooter={(f) =>
          f.editable && (
            <div className="row-adds">
              {f.addRow && <button type="button" className="row-insert row-insert-end" onClick={f.addRow}><span>+ Add row</span></button>}
              {f.addSection && sections.length < MAX_SECTIONS && <button type="button" className="row-insert row-insert-end" onClick={f.addSection}><span>+ Add section</span></button>}
            </div>
          )
        }
        suggest={(s, cell) => suits(s.key) === cell.view}
        makeRow={(offGrid) => ({ view: offGrid.length ? suits(offGrid[0].key) : 'highlight', slots: Math.min(MAX_SLOTS, offGrid.length) || 2 })}
        renderSlot={(p) => <DefaultSlot {...p} labels={{ ...p.labels, drop: `Drag a card here to show it as ${VIEW_LABELS[p.row.view].toLowerCase()}` }} />}
        fillSlot={(row, offGrid) => offGrid.find((s) => suits(s.key) === row.view) ?? offGrid[0]}
        rowLabels={{ add: 'Add a stat…', suggested: 'Suits this card type', newSection: 'Section' }}
        labels={{ cycle: 'swap', cyclePrev: 'Previous stat', cycleNext: 'Next stat' }}
        onAnnounce={setStatus}
        onOpen={(s) => setOpen(s)}
      />
      {guide && <Guide onClose={() => setGuide(false)} />}
      {open && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={open.title} onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className={'modal-box' + (details[open.key] ? ' wide' : '')}>
            <header>
              <h2 className="modal-title">
                <StatIcon statKey={open.key} tag={open.tag} />
                {open.title}
              </h2>
              <button type="button" className="modal-close" aria-label="Close" autoFocus onClick={() => setOpen(null)}>✕</button>
            </header>
            {details[open.key] ?? (
              <>
            <p className="modal-big">
              <b>{open.display}</b> {open.unit}
            </p>
            <p className="modal-line">{open.line}</p>
            {open.series.length > 0 && (
              <ol className={'v-toplist modal-list' + (open.series.some((e) => e.image || e.poster) ? ' art' : '')}>
                {open.series.map((e, i) => (
                  <li key={i} className={e.badge}>
                    {e.image || e.poster ? <FitImg src={e.poster ?? e.image} className="modal-thumb" /> : <span className="rk">{i + 1}</span>}
                    <span className="nm">{e.label}</span>
                    <span className="sc">{e.display}</span>
                  </li>
                ))}
              </ol>
            )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
