import { allRows, fillRows, rowItems, type Assignment } from 'morphgrid';
import {
  DEFAULT_TITLE, EXTRA_TITLE, MAX_ROWS, MAX_SECTIONS, MAX_SLOTS, MAX_TITLE, PRESETS, VIEW_CODES, VIEW_KEYS, presetById,
  type DashRow, type DashSection, type Preset, type ViewKey,
} from './presets';

export type { Assignment };

export interface DashState {
  sections: DashSection[];
  layout: Assignment;
}

const CODE_TO_VIEW = Object.fromEntries(VIEW_KEYS.map((v) => [VIEW_CODES[v], v])) as Record<string, ViewKey>;

// The card type each stat suits best, for stats a preset has no slot for.
const EXTRA_VIEW: Record<string, ViewKey> = {
  gamerscore: 'highlight',
  achievements: 'highlight',
  completed: 'showcase',
  completion: 'progress',
  almost: 'toplist',
  playtime: 'chart',
  top: 'showcase',
  recent: 'toplist',
  platforms: 'radial',
  rarest: 'showcase',
  rarity: 'radial',
  when: 'radial',
  calendar: 'heatmap',
  starts: 'heatmap',
  scorerate: 'toplist',
  oneanddone: 'showcase',
  finishrate: 'highlight',
  biggest: 'showcase',
  genres: 'radial',
  eras: 'chart',
  instead: 'summary',
  backlog: 'toplist',
  thisyear: 'chart',
  value: 'highlight',
  costhour: 'toplist',
  rated: 'showcase',
  studios: 'chart',
  gamepass: 'progress',
};

export const suits = (key: string): ViewKey => EXTRA_VIEW[key] ?? 'highlight';

type RowSpec = [ViewKey, (string | null)[]];
type Spec = { title: string; rows: RowSpec[] }[];

// Section ids are s0, s1…; row ids r0, r1… run across the whole board.
function build(spec: Spec): DashState {
  let n = 0;
  const sections = spec.map((s, i) => ({ id: `s${i}`, title: s.title, rows: s.rows.map(([view, keys]) => ({ id: `r${n++}`, view, slots: keys.length })) }));
  return { sections, layout: fillRows(allRows(sections), spec.flatMap((s) => s.rows.map(([, keys]) => keys))) };
}

// Stats grouped into rows by card type, types in order of first appearance, at most MAX_SLOTS per row.
function byType(entries: [string, ViewKey][]): RowSpec[] {
  const by = new Map<ViewKey, string[]>();
  for (const [key, view] of entries) by.set(view, [...(by.get(view) ?? []), key]);
  const spec: RowSpec[] = [];
  for (const [view, keys] of by) for (let i = 0; i < keys.length; i += MAX_SLOTS) spec.push([view, keys.slice(i, i + MAX_SLOTS)]);
  return spec;
}

// A preset's sections, filled with the stats this profile has. Rows and sections left empty are dropped; stats the
// preset has no slot for get rows of their own in a last section.
export function presetBoard(preset: Preset, keys: string[]): DashState {
  const have = new Set(keys);
  const used = new Set<string>();
  const spec: Spec = [];
  for (const s of preset.sections) {
    const rows: RowSpec[] = [];
    for (const r of s.rows) {
      const got = r.prefer.filter((k) => have.has(k) && !used.has(k));
      got.forEach((k) => used.add(k));
      if (got.length) rows.push([r.view, got]);
    }
    if (rows.length) spec.push({ title: s.title, rows });
  }
  const extra = keys.filter((k) => !used.has(k)).map((k): [string, ViewKey] => [k, suits(k)]);
  if (extra.length) spec.push({ title: EXTRA_TITLE, rows: byType(extra) });
  return build(spec);
}

export const boardRows = (state: DashState): DashRow[] => allRows(state.sections);

// Rows as a type letter and slot count each, sections separated by "_": "h4w3_c3m1".
export const encodeRows = (sections: DashSection[]) => sections.map((s) => s.rows.map((r) => VIEW_CODES[r.view] + r.slots).join('')).join('_');

const cleanTitle = (t: string) => t.replace(/~/g, '-').trim().slice(0, MAX_TITLE);
export const encodeTitles = (sections: DashSection[]) => sections.map((s) => cleanTitle(s.title)).join('~');

// Links from before sections have no "_" and no titles: all their rows go in one section.
export function decodeSections(raw: string | null | undefined, titles?: string | null): DashSection[] | null {
  if (!raw) return null;
  const parts = raw.split('_');
  if (parts.length > MAX_SECTIONS) return null;
  const names = titles?.split('~') ?? [];
  let n = 0;
  const sections: DashSection[] = [];
  for (const [i, part] of parts.entries()) {
    const codes = part.match(/[a-z]\d/g) ?? [];
    if (codes.join('') !== part) return null;
    const rows = codes.map((c) => ({ id: `r${n++}`, view: CODE_TO_VIEW[c[0]], slots: +c[1] }));
    if (!rows.every((r) => r.view && r.slots >= 1 && r.slots <= MAX_SLOTS)) return null;
    const title = cleanTitle(names[i] ?? '') || (parts.length === 1 ? DEFAULT_TITLE : `Section ${i + 1}`);
    sections.push({ id: `s${i}`, title, rows });
  }
  return n >= 1 && n <= MAX_ROWS ? sections : null;
}

export const decodeRows = (raw: string | null | undefined): DashRow[] | null => {
  const s = decodeSections(raw);
  return s && allRows(s);
};

export const encodeLayout = (rows: DashRow[], layout: Assignment) =>
  rowItems(rows, layout)
    .flat()
    .map((k) => k ?? '')
    .join('.');

// Unknown and repeated stats become empty slots.
export function decodeLayout(raw: string, rows: DashRow[], keys: string[]): Assignment {
  const parts = raw.split('.');
  const have = new Set(keys);
  const used = new Set<string>();
  let i = 0;
  const items = rows.map((r) =>
    Array.from({ length: r.slots }, () => {
      const k = parts[i++];
      if (!k || !have.has(k) || used.has(k)) return null;
      used.add(k);
      return k;
    }),
  );
  return fillRows(rows, items);
}

const same = (a: DashState, b: DashState) =>
  encodeRows(a.sections) === encodeRows(b.sections) &&
  encodeTitles(a.sections) === encodeTitles(b.sections) &&
  encodeLayout(boardRows(a), a.layout) === encodeLayout(boardRows(b), b.layout);

// The preset this board still matches, or null once it has been rearranged or renamed.
export function matchPreset(state: DashState, keys: string[]): string | null {
  return PRESETS.find((p) => same(presetBoard(p, keys), state))?.id ?? null;
}

export function dashQuery(state: DashState, keys: string[]): URLSearchParams {
  const q = new URLSearchParams();
  const preset = matchPreset(state, keys);
  if (preset) {
    if (preset !== 'standard') q.set('p', preset);
  } else {
    q.set('r', encodeRows(state.sections));
    q.set('n', encodeTitles(state.sections));
    q.set('l', encodeLayout(boardRows(state), state.layout));
  }
  return q;
}

export function readDashState(
  q: { p?: string | null; r?: string | null; n?: string | null; l?: string | null },
  keys: string[],
): DashState {
  const sections = decodeSections(q.r, q.n);
  if (sections) return { sections, layout: decodeLayout(q.l ?? keys.join('.'), allRows(sections), keys) };
  return presetBoard(presetById(q.p), keys);
}

// Whose clock the time-of-day stats use: an IANA time zone and whether hours read 5 PM or 17:00.
export interface Clock {
  tz: string;
  h12: boolean;
}

export const readClock = (tz?: string | null, h?: string | null): Clock => ({ tz: validTimeZone(tz), h12: h !== '24' });

export function clockQuery(c: Clock): URLSearchParams {
  const q = new URLSearchParams();
  if (c.tz !== 'UTC') q.set('tz', c.tz);
  if (!c.h12) q.set('h', '24');
  return q;
}

export function validTimeZone(tz: string | null | undefined): string {
  if (!tz) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}
