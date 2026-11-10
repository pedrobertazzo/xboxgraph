import type { Game, XboxProfile } from './types';

export const MAX_PLAYERS = 4;
const nf = (n: number) => Math.round(n).toLocaleString('en-US');

export type Row = { key: string; label: string; values: number[]; display: string[]; note?: string };

const started = (p: XboxProfile) => p.games.filter((g) => g.achievements && g.achievements.maxScore > 0 && g.achievements.score > 0);
export const isComplete = (g: Game) => !!g.achievements && g.achievements.maxScore > 0 && g.achievements.score >= g.achievements.maxScore;

// Head-to-head figures, one row each, a value per player. Higher is the lead in every row.
export function compareRows(ps: XboxProfile[]): Row[] {
  const completion = (p: XboxProfile) => {
    const s = started(p);
    return s.length ? Math.round(s.reduce((a, g) => a + g.achievements!.progress, 0) / s.length) : 0;
  };
  const hours = (p: XboxProfile) => p.games.reduce((a, g) => a + (g.playMin ?? 0), 0) / 60;
  const unlocked = (p: XboxProfile) => p.games.reduce((a, g) => a + (g.achievements?.earned ?? 0), 0);
  const rows: Row[] = [
    { key: 'gamerscore', label: 'Gamerscore', values: ps.map((p) => p.gamerscore), display: [] },
    { key: 'achievements', label: 'Achievements', values: ps.map(unlocked), display: [] },
    { key: 'completed', label: 'Games at 100%', values: ps.map((p) => p.games.filter(isComplete).length), display: [] },
    { key: 'completion', label: 'Average completion', values: ps.map(completion), display: [] },
    {
      key: 'rare',
      label: 'Rare achievements (10% or fewer)',
      values: ps.map((p) => p.unlocks.filter((u) => u.rarity != null && u.rarity <= 10).length),
      display: [],
      note: ps.some((p) => p.unlocksHidden || p.unlocksCapped) ? 'Counts up to each player’s 2,000 most recent unlocks.' : undefined,
    },
    { key: 'hours', label: 'Hours played', values: ps.map(hours), display: [], note: ps.some((p) => p.playHidden) ? 'Some players hide their play time.' : undefined },
    { key: 'games', label: 'Games started', values: ps.map((p) => started(p).length), display: [] },
  ];
  for (const r of rows) r.display = r.values.map((v) => (r.key === 'completion' ? `${v}%` : r.key === 'gamerscore' ? `${nf(v)}G` : nf(v)));
  return rows;
}

// Who leads each row; ties lead nobody.
export function leaders(rows: Row[]): (number | null)[] {
  return rows.map((r) => {
    const max = Math.max(...r.values);
    const at = r.values.filter((v) => v === max).length;
    return max > 0 && at === 1 ? r.values.indexOf(max) : null;
  });
}

export type Shared = { id: string; title: string; art: string | null; progress: (number | null)[]; complete: boolean[] };

// Games at least two players have achievements in, most shared first, then by combined progress.
export function sharedGames(ps: XboxProfile[]): Shared[] {
  const by = new Map<string, Shared>();
  ps.forEach((p, i) => {
    for (const g of p.games) {
      if (!g.achievements || g.achievements.score <= 0) continue;
      const s = by.get(g.id) ?? { id: g.id, title: g.title, art: g.art ?? g.icon, progress: ps.map(() => null), complete: ps.map(() => false) };
      s.art ??= g.art ?? g.icon;
      s.progress[i] = g.achievements.progress;
      s.complete[i] = isComplete(g);
      by.set(g.id, s);
    }
  });
  const count = (s: Shared) => s.progress.filter((x) => x != null).length;
  return [...by.values()].filter((s) => count(s) >= 2).sort((a, b) => count(b) - count(a) || b.progress.reduce<number>((x, v) => x + (v ?? 0), 0) - a.progress.reduce<number>((x, v) => x + (v ?? 0), 0));
}

// Each player's 100% games that none of the others has completed, newest first.
export function onlyCompleted(ps: XboxProfile[]): Game[][] {
  const at = (g: Game) => g.lastUnlock ?? g.lastPlayed ?? 0;
  return ps.map((p, i) =>
    p.games.filter((g) => isComplete(g) && !ps.some((q, j) => j !== i && q.games.some((h) => h.id === g.id && isComplete(h)))).sort((a, b) => at(b) - at(a)),
  );
}

// Gamertags from a compare path, cleaned, deduplicated and capped.
export function parseIds(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    let id = r;
    try {
      id = decodeURIComponent(r);
    } catch {}
    id = id.trim().replace(/\s+/g, ' ').toLowerCase();
    if (id && !seen.has(id)) seen.add(id), out.push(id);
  }
  return out.slice(0, MAX_PLAYERS);
}
