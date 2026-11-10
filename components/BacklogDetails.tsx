'use client';

import { useMemo, useState } from 'react';
import { SIZES, fmtLeft, howLong, sizeOf, type Backlog } from '@/lib/backlog';
import { FitImg } from './FitImg';

const nf = (n: number) => Math.round(n).toLocaleString('en-US');
const LIMIT = 12;

// The full Backlog behind the card's ⤢: every unfinished game with its hours left, filterable by size and sortable,
// as on the Steam grid.
export function BacklogDetails({ data }: { data: Backlog }) {
  const [size, setSize] = useState<string | null>(null);
  const [order, setOrder] = useState<'short' | 'long'>('short');
  const [all, setAll] = useState(false);
  const buckets = useMemo(
    () =>
      SIZES.map((s) => {
        const games = data.games.filter((g) => sizeOf(g.left) === s.key);
        return { ...s, count: games.length, hours: games.reduce((a, g) => a + g.left, 0) };
      }),
    [data.games],
  );
  const list = useMemo(() => {
    const l = data.games.filter((g) => !size || sizeOf(g.left) === size);
    return [...l].sort((a, b) => (order === 'short' ? a.left - b.left : b.left - a.left));
  }, [data.games, size, order]);
  const max = Math.max(1, ...list.map((g) => g.left));
  const shown = all ? list : list.slice(0, LIMIT);
  const pace = howLong(data.total, data.perWeek);
  const averaged = data.games.filter((g) => g.source === 'average').length;

  return (
    <div className="bl">
      <div className="bl-hero">
        <span className="bl-label">To finish everything you started (to 100%)</span>
        <b className="bl-total">
          {nf(data.total)}
          <small> hrs</small>
        </b>
        <p className="bl-sub">
          That’s <b>{nf(data.total / 24)} days</b> nonstop
          {pace && (
            <>
              , or about <b>{pace}</b> at your usual {data.perWeek! >= 10 ? nf(data.perWeek!) : data.perWeek!.toFixed(1)} hrs a week
            </>
          )}
          .
        </p>
        <div className="vb-stack" aria-hidden>
          {buckets.map((b, i) => (b.hours > 0 ? <i key={b.key} className={`z${i}` + (size && size !== b.key ? ' dim' : '')} style={{ flexGrow: b.hours }} /> : null))}
        </div>
        <div className="bl-legend" role="group" aria-label="Filter by length">
          {buckets.map((b, i) => (
            <button
              key={b.key}
              type="button"
              className={'bl-chip' + (size === b.key ? ' on' : '')}
              aria-pressed={size === b.key}
              disabled={!b.count}
              onClick={() => (setSize(size === b.key ? null : b.key), setAll(false))}
            >
              <span className={`sw z${i}`} />
              <span>
                <b>{b.label}</b> {b.hint}
              </span>
              <span className="n">
                {b.count} · {nf(b.hours)} h
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="bl-tools">
        <span>{size ? `${list.length} ${SIZES.find((s) => s.key === size)!.label.toLowerCase()} game${list.length === 1 ? '' : 's'}` : `All ${list.length} games`}</span>
        <label className="preset-pick">
          <span>Sort</span>
          <select value={order} onChange={(e) => setOrder(e.target.value as 'short' | 'long')} aria-label="Sort the backlog">
            <option value="short">Quickest first</option>
            <option value="long">Longest first</option>
          </select>
        </label>
      </div>

      <ol className="bl-list">
        {shown.map((g) => (
          <li key={g.id} className="bl-row">
            <FitImg src={g.poster ?? g.image} className="bl-art" />
            <span className="bl-name">
              <b>{g.title}</b>
              <span>
                {g.progress}% done{g.playedHours ? ` · ${fmtLeft(g.playedHours)} played` : ''}
                {g.source === 'average' && <em title="Too little to go on, so this uses your average hours per 100%"> · estimate</em>}
              </span>
            </span>
            <span className="bl-bar" aria-hidden>
              <i className={`z${SIZES.findIndex((s) => s.key === sizeOf(g.left))}`} style={{ width: `${Math.max(3, (g.left / max) * 100)}%` }} />
            </span>
            <span className="bl-h">{fmtLeft(g.left)}</span>
          </li>
        ))}
      </ol>
      {list.length > LIMIT && (
        <button type="button" className="btn ghost small bl-more" onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${list.length}`}
        </button>
      )}
      <p className="bl-foot">
        Hours left are projected from your own pace: how long a game has taken you so far against how far through its
        gamerscore you are. {averaged > 0 && <>{averaged} game{averaged === 1 ? ' has' : 's have'} too little to go on (under 20% done, or no play time), so {averaged === 1 ? 'it uses' : 'they use'} your average of {nf(data.perCompletion)} hrs per 100% game. </>}
        Xbox doesn’t share games you own but haven’t played, so they can’t be counted.
      </p>
    </div>
  );
}
