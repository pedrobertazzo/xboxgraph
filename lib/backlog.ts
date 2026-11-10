import type { Game, XboxProfile } from './types';

// ---- Hours to finish what you started ----
//
// Xbox only lists the games someone has played, so there's no pile of never-played games, and its genres are too
// broad to estimate from. Instead each unfinished game is projected from the player's own pace: if 40% of its
// gamerscore took 20 hours, the other 60% should take about 30. Gamerscore is a rough gauge of how far through a game
// someone is, so these are estimates to 100%, not to the end of the story. Games with too little play to go on
// (Xbox 360 games have no play time at all), or under 20% done, use the player's average hours per 100%.

const DAY = 86400000;
const WEEK = 7 * DAY;
const FALLBACK_COMPLETION = 40;
// No single game is projected past this many hours, or three average completions if that's more.
const CAP = 150;
const MIN_PACE = 20;

export interface BacklogGame {
  id: string;
  title: string;
  image: string | null;
  poster: string | null;
  // Hours left to 100%, rounded to the half hour.
  left: number;
  progress: number;
  playedHours: number | null;
  // 'pace' when projected from the game's own play time and progress, 'average' when from the player's average.
  source: 'pace' | 'average';
  lastTouched: number;
}

export interface Backlog {
  games: BacklogGame[];
  total: number;
  // Hours a week this player usually plays, from their first unlock to today; null with no play time.
  perWeek: number | null;
  // Hours an average 100% takes them, the fallback for games with too little to go on.
  perCompletion: number;
}

const half = (h: number) => Math.max(0.5, Math.round(h * 2) / 2);
export const lastTouch = (g: Game) => Math.max(g.lastPlayed ?? 0, g.lastUnlock ?? 0);

export function backlogOf(p: XboxProfile, now = Date.now()): Backlog | null {
  const done = p.games.filter((g) => g.achievements && g.achievements.maxScore > 0 && g.achievements.progress >= 100 && (g.playMin ?? 0) > 0);
  const perCompletion = done.length ? done.reduce((s, g) => s + g.playMin! / 60, 0) / done.length : FALLBACK_COMPLETION;
  const games: BacklogGame[] = [];
  for (const g of p.games) {
    const a = g.achievements;
    if (!a || a.maxScore <= 0 || a.score <= 0 || a.progress >= 100) continue;
    const pr = Math.max(1, a.progress);
    const played = g.playMin ? g.playMin / 60 : null;
    // Under 20% the gamerscore says little about how far through a game someone is, so the average is used.
    const byPace = played !== null && played >= 0.5 && pr >= MIN_PACE;
    const left = Math.min(Math.max(CAP, perCompletion * 3), byPace ? (played! * (100 - pr)) / pr : (perCompletion * (100 - pr)) / 100);
    games.push({
      id: g.id,
      title: g.title,
      image: g.icon,
      poster: g.art ?? g.icon,
      left: half(left),
      progress: a.progress,
      playedHours: played,
      source: byPace ? 'pace' : 'average',
      lastTouched: lastTouch(g),
    });
  }
  if (!games.length) return null;
  games.sort((a, b) => a.left - b.left || b.progress - a.progress);
  const total = games.reduce((s, g) => s + g.left, 0);
  const hours = p.games.reduce((s, g) => s + (g.playMin ?? 0), 0) / 60;
  const first = Math.min(...p.games.map((g) => g.firstUnlock ?? Infinity), ...p.unlocks.map((u) => u.at));
  const weeks = Number.isFinite(first) ? Math.max(4, (now - first) / WEEK) : null;
  return { games, total, perWeek: hours > 0 && weeks ? hours / weeks : null, perCompletion };
}

export const untouched = (b: Backlog, now = Date.now()) => b.games.filter((g) => g.lastTouched && now - g.lastTouched > 182 * DAY).length;

// Size buckets by hours left, shortest first, as on the Steam grid.
export const SIZES: { key: string; label: string; hint: string; max: number }[] = [
  { key: 'quick', label: 'Quick', hint: 'under 5 hrs', max: 5 },
  { key: 'short', label: 'Short', hint: '5–15 hrs', max: 15 },
  { key: 'medium', label: 'Medium', hint: '15–40 hrs', max: 40 },
  { key: 'long', label: 'Epic', hint: '40+ hrs', max: Infinity },
];

export const sizeOf = (h: number) => SIZES.find((s) => h < s.max)!.key;

// How long a pile of hours takes at a weekly pace, in words.
export function howLong(hours: number, perWeek: number | null): string | null {
  if (!perWeek || perWeek <= 0) return null;
  const weeks = hours / perWeek;
  if (weeks < 1) return `${Math.max(1, Math.round(weeks * 7))} days`;
  if (weeks < 9) return `${Math.round(weeks)} week${Math.round(weeks) === 1 ? '' : 's'}`;
  const months = weeks / 4.345;
  if (months < 24) return `${Math.round(months)} months`;
  const yrs = months / 12;
  return `${yrs < 10 ? yrs.toFixed(1) : Math.round(yrs)} years`;
}

export const fmtLeft = (h: number) => (h === 1 ? '1 hr' : h < 10 && h % 1 ? `${h.toFixed(1)} hrs` : `${Math.round(h).toLocaleString('en-US')} hrs`);
