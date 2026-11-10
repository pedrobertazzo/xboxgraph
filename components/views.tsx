'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FitText, Grip, type ChromeProps, type RowHeaderProps, type ViewProps } from 'morphgrid';
import { VIEW_KEYS, type ViewKey } from '@/lib/presets';
import type { Heat, Stat } from '@/lib/types';
import { StatIcon } from './StatIcon';
import { Medal, type MedalKind } from './Medal';
import { FitImg } from './FitImg';
import { fmtLeft, howLong } from '@/lib/backlog';

export type View = ViewKey;

// Games have no page of their own here yet, so entries aren't links.
const useGameLink = () => (_e: unknown) => ({});

type P = ViewProps<Stat, View>;

export const VIEW_LABELS: Record<View, string> = {
  chart: 'Chart',
  highlight: 'Highlight',
  toplist: 'Top list',
  progress: 'Progress',
  summary: 'Summary',
  showcase: 'Showcase',
  heatmap: 'Heatmap',
  radial: 'Radial',
};

const nf = (n: number) => Math.round(n).toLocaleString('en-US');

// The badge drawn for a card's theme or an entry: a gamerscore coin, a 100% medal or a rare gem.
const medalFor = (t: string | undefined): MedalKind | null => (t === 'score' || t === 'complete' || t === 'rare' ? t : null);
// Covers of games at 100% get a gold frame, rare achievements a violet one.
const frame = (b: string | undefined) => (b === 'complete' ? ' gold-frame' : b === 'rare' ? ' gold-frame rare-frame' : '');

export function SealedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={'icon ' + (className ?? '')} aria-hidden>
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" fill="currentColor" opacity=".9" />
      <path d="M3 7.5 12 12l9-4.5M12 12v9" stroke="#1f211f" strokeWidth="1.4" fill="none" />
      <path d="M7.5 5.2 16.5 9.8" stroke="#1f211f" strokeWidth="1.4" />
    </svg>
  );
}

function Sparkles() {
  return (
    <span className="sparkles" aria-hidden>
      <i style={{ left: '12%', top: '18%', animationDelay: '0s' }} />
      <i style={{ left: '82%', top: '30%', animationDelay: '.8s' }} />
      <i style={{ left: '64%', top: '78%', animationDelay: '1.6s' }} />
    </span>
  );
}

export function Sealed({ e, delay = 0 }: { e: { label: string; image?: string | null; poster?: string | null; app?: string }; delay?: number }) {
  const link = useGameLink();
  return (
    <div className="sealed" style={{ ['--d' as string]: `${delay}s` }} title={`${e.label}: never played`} {...link(e)}>
      <Art image={e.image} poster={e.poster} prefer="poster" alt={e.label} />
      <span className="sealed-wrap" aria-hidden />
      <span className="sealed-tag">Unplayed</span>
    </div>
  );
}
const Empty = ({ item }: { item: Stat }) => <p className="empty">{item.line}</p>;

export function Img({ srcs, alt, className }: { srcs: (string | null | undefined)[]; alt: string; className?: string }) {
  const list = srcs.filter((s): s is string => !!s);
  const key = list.join('|');
  const [state, setState] = useState({ key, i: 0 });
  const i = state.key === key ? state.i : 0;
  if (i >= list.length) return <span className={'ph' + (className ? ' ' + className : '')} />;
  return <img key={list[i]} src={list[i]} alt={alt} loading="lazy" className={className} onError={() => setState({ key, i: i + 1 })} />;
}

function Highlight({ item }: P) {
  return (
    <div className={'v-highlight' + (item.theme ? ' ' + item.theme : '')}>
      <div className="hl-num">
        {item.theme === 'unplayed' && <SealedIcon className="hl-icon" />}
        {medalFor(item.theme) && <Medal kind={medalFor(item.theme)!} className="hl-icon" />}
        <b>{item.display}</b>
        {(item.theme === 'complete' || item.theme === 'rare') && <Sparkles />}
      </div>
      <span>{item.unit}</span>
    </div>
  );
}

// When a cell is too small for a chart to read, the stat shows as its headline number instead.
const tooSmall = (width: number, height: number) => width < 190 || height < 120;
// Room the card's takeaway line takes from views that show one.
const TAKEAWAY = 20;

function Compact({ item }: { item: Stat }) {
  return (
    <div className="v-highlight v-compact">
      <div className="hl-num"><b>{item.display}</b></div>
      <span>{item.unit}</span>
    </div>
  );
}

// "+3 more" under a list cut short by its cell; the full list is in the details view.
const More = ({ n }: { n: number }) => (n > 0 ? <p className="v-more">+{n} more</p> : null);

// A whole split into a few parts: one bar of segments, largest first, then the parts with their figures.
// Clearer than a ring for comparing shares; the shade steps down with rank, one hue.
function Split({ item, height }: P) {
  const data = [...item.series].sort((a, b) => b.value - a.value);
  const rows = Math.max(1, Math.min(data.length, Math.floor((height - 120 - TAKEAWAY) / 26)));
  return (
    <div className="v-split">
      <div className="split-bar" role="img" aria-label={`${item.title}: ${data.map((e) => `${e.label} ${e.display}`).join(', ')}`}>
        {data.map((e, i) => (
          <i key={i} className={`s${i}`} style={{ flexGrow: Math.max(e.value, 0.0001) }} title={`${e.label}: ${e.display}`} />
        ))}
      </div>
      <ol className="split-list">
        {data.slice(0, rows).map((e, i) => (
          <li key={i} className={i === 0 ? 'top' : ''}>
            <i className={`s${i}`} />
            <span>{e.label}</span>
            <b>{e.display}</b>
          </li>
        ))}
      </ol>
      <More n={data.length - rows} />
    </div>
  );
}

const uniform = (item: Stat) => item.series.length > 1 && item.series.every((e) => e.value === item.series[0].value);

function Chart(props: P) {
  const link = useGameLink();
  const { item, shape, height, width } = props;
  if (!item.series.length) return <Empty item={item} />;
  if (tooSmall(width, height)) return <Compact item={item} />;
  if (uniform(item)) return <TopList {...props} />;
  const max = Math.max(...item.series.map((e) => e.value), 1);
  // The biggest bar is lit; in lists sorted largest first that's the first one, in months or years it may not be.
  const lit = item.series.findIndex((e) => e.value === max);
  const vertical = shape !== 'tall' && item.series.every((e) => e.label.length <= 7);
  if (vertical)
    return (
      <div className="v-chart vert">
        {item.series.map((e, i) => (
          <div className="col" key={i} title={`${e.label}: ${e.display}`}>
            <span className="val">{e.display}</span>
            <div className="track">
              <i style={{ height: `${(e.value / max) * 100}%` }} className={(i === lit ? 'top ' : '') + (e.badge ?? '')} />
            </div>
            <span className="lab">{e.label}</span>
          </div>
        ))}
      </div>
    );
  const fit = Math.max(1, Math.floor((height - 56 - TAKEAWAY) / 28));
  const rows = fit >= item.series.length ? item.series.length : Math.max(1, fit - 1);
  return (
    <div className="v-chart horiz" style={{ ['--lab' as string]: width > 420 ? '15ch' : '10ch' }}>
      {item.series.slice(0, rows).map((e, i) => (
        <div className="row" key={i} title={`${e.label}: ${e.display}`} {...link(e)}>
          <span className="lab">{e.label}</span>
          <div className="track">
            <i style={{ width: `${(e.value / max) * 100}%` }} className={(i === lit ? 'top ' : '') + (e.badge ?? '')} />
          </div>
          <span className="val">{e.display}</span>
        </div>
      ))}
      <More n={item.series.length - rows} />
    </div>
  );
}

// The Backlog: hours to finish what you started, how long that is at the player's pace, the pile by size, and the
// quickest wins. Shown in place of a list or showcase, like the Steam grid's backlog card.
function BacklogCard({ item, wide, height }: { item: Stat; wide: boolean; height: number }) {
  const b = item.backlog!;
  const pace = howLong(b.total, b.perWeek);
  // As many of the quickest wins as fit whole under the totals and the size bar.
  const quickest = item.series.slice(0, Math.max(1, Math.min(3, Math.floor((height - 238) / 48))));
  const max = Math.max(1, ...quickest.map((e) => e.value));
  const next = item.cover;
  return (
    <div className={'v-backlog' + (wide ? ' wide' : '')}>
      <div className="vb-main">
        <div className="vb-total">
          <b>{nf(b.total)}</b>
          <span>hours to finish {b.games} game{b.games === 1 ? '' : 's'}</span>
        </div>
        <p className="vb-pace">
          {pace ? (
            <>
              About <b>{pace}</b> at your usual {b.perWeek! >= 10 ? nf(b.perWeek!) : b.perWeek!.toFixed(1)} hrs a week
            </>
          ) : (
            <>That’s {nf(b.total / 24)} days nonstop</>
          )}
        </p>
        <div className="vb-sizes">
          <div className="vb-stack" aria-hidden>
            {b.sizes.map((sz, i) => (sz.hours > 0 ? <i key={sz.key} className={`z${i}`} style={{ flexGrow: sz.hours }} /> : null))}
          </div>
          <ul>
            {b.sizes.map((sz, i) => (
              <li key={sz.key} title={`${sz.label}: ${sz.hint}, ${nf(sz.hours)} hrs`}>
                <i className={`z${i}`} />
                {sz.count} {sz.label.toLowerCase()}
              </li>
            ))}
          </ul>
        </div>
        <ol className="vb-list">
          {quickest.map((e) => (
            <li key={e.label}>
              <FitImg src={e.poster ?? e.image} className="vb-art" />
              <span className="nm">{e.label}</span>
              <span className="bar">
                <i style={{ width: `${Math.max(4, (e.value / max) * 100)}%` }} />
              </span>
              <b>{e.display}</b>
            </li>
          ))}
        </ol>
      </div>
      {wide && next && (
        <div className="vb-next">
          <FitImg src={next.poster ?? next.image} className="vb-next-art" />
          <span className="vb-next-text">
            <small>Up next · quickest win</small>
            <b>{next.label}</b>
            {item.series[0] && <span>{item.series[0].display} to 100%</span>}
          </span>
        </div>
      )}
      <p className="vb-foot">
        {b.longest ? <>Longest: {b.longest.label}, {fmtLeft(b.longest.hours)}</> : null}
        {b.untouched > 0 && <>{b.longest ? ' · ' : ''}{b.untouched} untouched for 6 months</>}
      </p>
    </div>
  );
}

function TopList({ item, height, width }: P) {
  const link = useGameLink();
  if (item.backlog && !tooSmall(width, height)) return <BacklogCard item={item} wide={width >= 560} height={height} />;
  if (!item.series.length) return <Empty item={item} />;
  if (tooSmall(width, height)) return <Compact item={item} />;
  const withArt = width > 230 && item.series.some((e) => e.image);
  const fit = Math.max(1, Math.floor((height - 52 - TAKEAWAY) / (withArt ? 44 : 30)));
  const rows = fit >= item.series.length ? item.series.length : Math.max(1, fit - 1);
  return (
    <>
    <ol className={'v-toplist' + (withArt ? ' art' : '')}>
      {item.series.slice(0, rows).map((e, i) => (
        <li key={i} className={e.badge} {...link(e)}>
          {withArt && (
            <span className={'thumb' + frame(e.badge)} style={{ ['--d' as string]: `${i * 0.7}s` }}>
              <Art image={e.image} poster={e.poster} prefer="poster" alt="" />
            </span>
          )}
          {!withArt && (e.badge === 'unplayed' ? <SealedIcon className="rk-icon" /> : medalFor(e.badge) ? <Medal kind={medalFor(e.badge)!} className="rk-icon" /> : <span className="rk">{i + 1}</span>)}
          <span className="nm">
            {withArt && e.badge === 'unplayed' && <SealedIcon className="nm-icon" />}
            {e.label}
          </span>
          <span className="sc">
            {withArt && medalFor(e.badge) && <Medal kind={medalFor(e.badge)!} className="sc-icon" />}
            {e.display}
          </span>
        </li>
      ))}
    </ol>
    <More n={item.series.length - rows} />
    </>
  );
}

function Progress({ item, shape }: P) {
  const { value, max, label } = item.progress;
  const p = Math.max(0, Math.min(1, value / max));
  return (
    <div className={'v-progress' + (shape === 'tall' ? ' tall' : '') + (item.theme ? ' ' + item.theme : '')}>
      <div className="p-head">
        <span>{label}</span>
        <b>{Math.round(p * 100)}%</b>
      </div>
      <div className="p-track" role="meter" aria-valuenow={Math.round(p * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <i style={{ [shape === 'tall' ? 'height' : 'width']: `${p * 100}%` }} />
      </div>
      <p className="p-foot">
        {nf(value)} of {nf(max)}
      </p>
    </div>
  );
}

function Summary({ item }: P) {
  return (
    <div className={'v-summary' + (item.theme ? ' ' + item.theme : '')}>
      {item.theme === 'unplayed' && <SealedIcon className="summary-icon" />}
      {medalFor(item.theme) && <Medal kind={medalFor(item.theme)!} className="summary-icon" />}
      <FitText min={13} max={21} className="summary-text">
        {item.line}
      </FitText>
    </div>
  );
}

function Art({ image, poster, prefer, alt }: { image?: string | null; poster?: string | null; prefer: 'poster' | 'wide'; alt: string }) {
  const srcs = prefer === 'poster' ? [poster, image] : [image, poster];
  return (
    <div className="fit-art">
      <Img srcs={srcs} alt="" className="fit-bg" />
      <Img srcs={srcs} alt={alt} className="fit-fg" />
    </div>
  );
}

const BANNER = 460 / 215;
const POSTER = 2 / 3;
function preferFor(boxW: number, boxH: number): 'poster' | 'wide' {
  const r = boxW / Math.max(1, boxH);
  return Math.abs(Math.log(r / BANNER)) < Math.abs(Math.log(r / POSTER)) ? 'wide' : 'poster';
}

function Caption({ item, name }: { item: Stat; name?: string }) {
  return (
    <figcaption>
      <b>{item.display}</b> {item.unit}
      {name && <span>{name}</span>}
    </figcaption>
  );
}

function Showcase({ item, shape, width, height }: P) {
  const link = useGameLink();
  if (item.backlog && !tooSmall(width, height)) return <BacklogCard item={item} wide={width >= 560} height={height} />;
  const cover = item.cover;
  if (cover && (cover.image || cover.poster))
    return (
      <figure className={`v-showcase ${shape}`} {...link(cover)}>
        <Art image={cover.image} poster={cover.poster} prefer={preferFor(shape === 'wide' ? (width - 28) * 0.62 : width - 28, shape === 'wide' ? height - 70 : height - 130)} alt={cover.label} />
        <Caption item={item} name={cover.label} />
      </figure>
    );

  const art = (item.gallery ?? item.series).filter((e) => e.poster || e.image);
  if (art.length >= 2) {
    let cols = 2;
    let rows = shape === 'tall' ? 3 : 2;
    if (shape === 'wide') {
      rows = 1;
      cols = Math.max(3, Math.min(6, Math.round(width / ((height - 80) * 0.67 + 8))));
    }
    const n = Math.min(art.length, cols * rows);
    rows = Math.ceil(n / cols);
    return (
      <figure className={`v-showcase wall ${shape}`}>
        <div className="wall-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
          {art.slice(0, n).map((e, i) =>
            e.badge === 'unplayed' ? (
              <Sealed key={i} e={e} delay={i * 0.5} />
            ) : (
              <div key={i} className={'wall-item' + frame(e.badge)} style={{ ['--d' as string]: `${i * 0.6}s` }} title={`${e.label}: ${e.display}`} {...link(e)}>
                <Art image={e.image} poster={e.poster} prefer="poster" alt={e.label} />
                {medalFor(e.badge) && (
                  <span className="trophy-badge">
                    <Medal kind={medalFor(e.badge)!} />
                  </span>
                )}
              </div>
            ),
          )}
        </div>
        <Caption item={item} />
      </figure>
    );
  }

  const max = Math.max(...item.series.map((e) => e.value), 1);
  const top = item.series.reduce((b, e, i) => (e.value > item.series[b].value ? i : b), 0);
  return (
    <div className={`v-poster ${shape}`}>
      <div className="pt-text">
        <span className="pt">{item.title}</span>
        <b>{item.display}</b>
        <span className="pu">{item.unit}</span>
      </div>
      {item.series.length > 1 && (
        <div className="mini" aria-hidden>
          {item.series.map((e, i) => (
            <i key={i} className={i === top ? 'top' : ''} style={{ height: `${Math.max(4, (e.value / max) * 100)}%` }} title={`${e.label}: ${e.display}`} />
          ))}
        </div>
      )}
    </div>
  );
}

const level = (v: number, max: number) => (v < 0 ? -1 : v === 0 || !max ? 0 : Math.min(4, Math.ceil((v / max) * 4)));

function transpose(h: Heat): Heat {
  const values: number[] = [];
  const tips: string[] = [];
  for (let c = 0; c < h.cols; c++)
    for (let r = 0; r < h.rows; r++) {
      values.push(h.values[r * h.cols + c]);
      tips.push(h.tips?.[r * h.cols + c] ?? '');
    }
  return { rows: h.cols, cols: h.rows, values, tips, rowLabels: h.colLabels, colLabels: h.rowLabels };
}

function lastCols(h: Heat, keep: number): Heat {
  if (keep >= h.cols) return h;
  const from = h.cols - keep;
  const pick = <T,>(arr: T[] | undefined) => arr && Array.from({ length: h.rows * keep }, (_, i) => arr[Math.floor(i / keep) * h.cols + from + (i % keep)]);
  return { ...h, cols: keep, values: pick(h.values)!, tips: pick(h.tips), colLabels: h.colLabels?.slice(from) };
}

function tileLevel(v: number, min: number, max: number) {
  if (v <= 0) return 0;
  if (max === min) return 2;
  return 1 + Math.min(3, Math.floor(((v - min) / (max - min)) * 4));
}

function Heatmap(props: P) {
  const { item, shape, width } = props;
  if (!item.heat) {
    if (!item.series.length) return <Empty item={item} />;
    if (uniform(item)) return <TopList {...props} />;
    const vals = item.series.map((e) => e.value).filter((v) => v > 0);
    const min = Math.min(...vals), max = Math.max(...vals);
    return (
      <div className="v-tiles">
        {item.series.map((e, i) => (
          <div key={i} className={`tile l${tileLevel(e.value, min, max)}${e.badge ? ' ' + e.badge : ''}`} title={`${e.label}: ${e.display}`}>
            <span>{e.label}</span>
            <b>{e.display}</b>
          </div>
        ))}
      </div>
    );
  }
  const base = shape === 'tall' && item.heat.cols > item.heat.rows ? transpose(item.heat) : item.heat;
  const h = lastCols(base, Math.max(8, Math.floor((width - 70) / 9)));
  const max = Math.max(...h.values, 1);
  return (
    <div className="v-heat" style={{ gridTemplateColumns: `auto repeat(${h.cols}, minmax(0, 1fr))`, gridTemplateRows: `auto repeat(${h.rows}, minmax(0, 1fr))` }}>
      <span />
      {Array.from({ length: h.cols }, (_, c) => (
        <span key={`c${c}`} className="hl col">{h.colLabels?.[c] ?? ''}</span>
      ))}
      {Array.from({ length: h.rows }, (_, r) => [
        <span key={`r${r}`} className="hl row">{h.rowLabels?.[r] ?? ''}</span>,
        ...Array.from({ length: h.cols }, (_, c) => {
          const i = r * h.cols + c;
          const l = level(h.values[i], max);
          return <i key={i} className={l < 0 ? 'off' : `l${l}`} title={h.tips?.[i] || undefined} />;
        }),
      ])}
    </div>
  );
}

function RadialLegend({ item, rows }: { item: Stat; rows: number }) {
  const top = [...item.series].sort((a, b) => b.value - a.value).slice(0, rows);
  return (
    <div className="radial-legend">
      <span className="rl-unit">{item.unit}</span>
      <ol>
        {top.map((e, i) => (
          <li key={i}>
            <i className={i === 0 ? 'top' : ''} />
            <span>{e.label}</span>
            <b>{e.display}</b>
          </li>
        ))}
      </ol>
      <p className="rl-note">{item.progress.label}</p>
    </div>
  );
}

function Radial(props: P) {
  const { item, width, height } = props;
  const data = item.series;
  const bodyW = width - 28;
  const bodyH = height - 70 - TAKEAWAY;
  const mode = bodyW > bodyH * 1.25 ? 'side' : bodyH > bodyW * 1.35 ? 'below' : 'none';
  const rows = mode === 'side' ? Math.max(1, Math.min(4, Math.floor((bodyH - 46) / 24))) : 3;
  if (!data.length) return <Empty item={item} />;
  if (tooSmall(width, height)) return <Compact item={item} />;
  if (uniform(item)) return <TopList {...props} />;
  // A ring suits cyclic data such as hours of the day; a few shares of a whole read better as one split bar.
  // Separate percentages (each grade's share taken, say) aren't parts of one whole, so they get a bar each.
  if (data.every((e) => e.display.endsWith('%')) && data.reduce((s, e) => s + e.value, 0) > 110) return <Chart {...props} />;
  if (data.length <= 6) return <Split {...props} />;
  const n = data.length;
  const max = Math.max(...data.map((e) => e.value), 1);
  const cx = 120, cy = 120, r0 = 40, r1 = 84;
  const step = (Math.PI * 2) / n;
  const gap = Math.min(0.06, step * 0.15);
  const showLabels = n <= 12 && data.every((e) => e.label.length <= 8);
  const pt = (r: number, a: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  return (
    <div className={`v-radial ${mode}`}>
      <svg viewBox="0 0 240 240" role="img" aria-label={`${item.title}: ${data.map((e) => `${e.label} ${e.display}`).join(', ')}`}>
        <circle cx={cx} cy={cy} r={r1} className="ring" />
        <circle cx={cx} cy={cy} r={r0} className="ring" />
        {data.map((e, i) => {
          const a0 = i * step + gap, a1 = (i + 1) * step - gap;
          const r = r0 + Math.max(2, ((r1 - r0) * e.value) / max);
          const [x0, y0] = pt(r0, a0), [x1, y1] = pt(r, a0), [x2, y2] = pt(r, a1), [x3, y3] = pt(r0, a1);
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const d = `M${x0} ${y0} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r0} ${r0} 0 ${large} 0 ${x0} ${y0}Z`;
          const [lx, ly] = pt(r1 + 18, (a0 + a1) / 2);
          return (
            <g key={i}>
              <path d={d} className={(e.value === max ? 'bar top' : 'bar') + (e.badge ? ' ' + e.badge : '')}>
                <title>{`${e.label}: ${e.display}`}</title>
              </path>
              {showLabels && (
                <text x={lx} y={ly} className="lab" textAnchor="middle" dominantBaseline="middle">{e.label}</text>
              )}
            </g>
          );
        })}
        <text x={cx} y={cy - 2} className="mid" textAnchor="middle" dominantBaseline="middle">{item.display}</text>
      </svg>
      {mode !== 'none' && <RadialLegend item={item} rows={rows} />}
    </div>
  );
}

export const VIEWS = {
  highlight: Highlight,
  chart: Chart,
  toplist: TopList,
  progress: Progress,
  summary: Summary,
  showcase: Showcase,
  heatmap: Heatmap,
  radial: Radial,
};

const VIEW_ICONS: Record<View, React.ReactNode> = {
  chart: <path d="M4 6h10M4 12h16M4 18h7" strokeWidth="2.4" strokeLinecap="round" />,
  highlight: <text x="12" y="17" textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor" stroke="none">#</text>,
  toplist: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" strokeWidth="2.2" strokeLinecap="round" />,
  progress: <path d="M4 12h16M4 12h10" strokeWidth="5" strokeLinecap="round" strokeOpacity=".9" />,
  summary: <path d="M4 7h16M4 12h16M4 17h10" strokeWidth="2" strokeLinecap="round" />,
  showcase: <path d="M6 3h12v18H6zM6 15l4-4 3 3 2-2 3 3" strokeWidth="1.8" strokeLinejoin="round" />,
  heatmap: <path d="M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z" strokeWidth="1.4" />,
  radial: <path d="M12 3a9 9 0 1 1-9 9M12 7a5 5 0 1 0 5 5M12 3v4M3 12h4" strokeWidth="2" strokeLinecap="round" />,
};

function ViewIcon({ view }: { view: View }) {
  return (
    <svg viewBox="0 0 24 24" className="vm-icon" fill="none" stroke="currentColor" aria-hidden>
      {VIEW_ICONS[view]}
    </svg>
  );
}

// The card-type menu, used in each row's header: the row decides how all its cards are drawn.
function ViewMenu({ view, label, onPick }: { view: View; label: string; onPick?: (view: View) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const w = 190, h = 8 * 34 + 12;
    const left = Math.max(8, Math.min(r.left, innerWidth - w - 8));
    const top = r.bottom + 6 + h > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6;
    setPos({ left, top });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const first = menu.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]') ?? menu.current?.querySelector('button');
    first?.focus();
    const away = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false);
    };
    const close = () => setOpen(false);
    addEventListener('pointerdown', away, true);
    addEventListener('scroll', close, true);
    addEventListener('resize', close);
    return () => {
      removeEventListener('pointerdown', away, true);
      removeEventListener('scroll', close, true);
      removeEventListener('resize', close);
    };
  }, [open, place]);

  if (!onPick)
    return (
      <span className="row-type">
        <ViewIcon view={view} />
        <span className="vm-label">{VIEW_LABELS[view]}</span>
      </span>
    );

  const onKey = (e: React.KeyboardEvent) => {
    const items = [...(menu.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      setOpen(false);
      btn.current?.focus();
    }
  };

  return (
    <span className="row-type" data-mg-nodrag>
      <button
        ref={btn}
        type="button"
        className="vm-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label}: ${VIEW_LABELS[view]}`}
        onClick={() => setOpen((o) => !o)}
      >
        <ViewIcon view={view} />
        <span className="vm-label">{VIEW_LABELS[view]}</span>
        <svg viewBox="0 0 8 5" className="vm-caret" aria-hidden>
          <path d="M0 0l4 5 4-5z" fill="currentColor" />
        </svg>
      </button>
      {open &&
        createPortal(
          <div ref={menu} className="vm-menu" role="menu" aria-label={label} style={pos} onKeyDown={onKey}>
            {VIEW_KEYS.map((v) => (
              <button
                key={v}
                type="button"
                role="menuitemradio"
                aria-checked={v === view}
                onClick={() => {
                  onPick(v);
                  setOpen(false);
                  btn.current?.focus();
                }}
              >
                <ViewIcon view={v} />
                <span>{VIEW_LABELS[v]}</span>
                {v === view && <span className="vm-check">✓</span>}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </span>
  );
}

// Views that lead with a one-line takeaway under the title; the others already say it in their body.
const TAKEAWAY_VIEWS = new Set<View>(['chart', 'toplist', 'radial', 'heatmap']);

export function CardChrome(p: ChromeProps<Stat, View>) {
  return (
    <div className="card">
      <header className="card-head">
        <span className="card-title">
          <StatIcon statKey={p.item.key} tag={p.item.tag} />
          <span>{p.label}</span>
        </span>
        <span className="card-tools" data-mg-nodrag>
          {p.canCycle && (
            <>
              <button type="button" data-mg-cycle="prev" aria-label={p.labels.cyclePrev} onClick={() => p.cycle(-1)}>‹</button>
              <button type="button" data-mg-cycle="next" aria-label={p.labels.cycleNext} onClick={() => p.cycle(1)}>›</button>
            </>
          )}
          <button type="button" aria-label={`Details for ${p.label}`} onClick={p.open}>⤢</button>
        </span>
      </header>
      {TAKEAWAY_VIEWS.has(p.view) && !p.item.backlog && p.item.progress.label && <p className="card-takeaway">{p.item.progress.label}</p>}
      <div className="card-body">{p.children}</div>
    </div>
  );
}

// `onInsert` adds a row above this one, from a "+ Add row here" control on the gap between rows.
export function RowHeader(h: RowHeaderProps<View>) {
  return (
    <div className="row-head">
      {h.editable && h.insertRow && (
        <button type="button" className="row-insert" aria-label={`Add a row above row ${h.index + 1}`} onClick={h.insertRow}>
          <span>+ Add row here</span>
        </button>
      )}
      {h.editable && <Grip {...h.handle} />}
      <ViewMenu view={h.row.view} label={`Card type for row ${h.index + 1}`} onPick={h.editable ? h.setView : undefined} />
      <span className="row-meta">
        {h.filled} of {h.row.slots}
      </span>
      {h.editable && (
        <span className="row-tools">
          <button type="button" aria-label={h.labels.moveUp} disabled={!h.canMoveUp} onClick={() => h.moveBy(-1)}>↑</button>
          <button type="button" aria-label={h.labels.moveDown} disabled={!h.canMoveDown} onClick={() => h.moveBy(1)}>↓</button>
          <button type="button" aria-label={h.labels.fewer} disabled={h.row.slots <= 1} onClick={() => h.setSlots(h.row.slots - 1)}>−</button>
          <button type="button" aria-label={h.labels.more} disabled={h.row.slots >= h.maxSlots} onClick={() => h.setSlots(h.row.slots + 1)}>+</button>
          <button type="button" aria-label={h.labels.remove} onClick={h.remove}>×</button>
        </span>
      )}
    </div>
  );
}
