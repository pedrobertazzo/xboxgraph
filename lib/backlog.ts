import type { Game, XboxProfile } from './types';

// ---- Hours to finish what you started ----
//
// Xbox only lists the games someone has played, so there's no pile of never-played games. When IGDB knows how long
// a game takes to 100% (lib/timetobeat.ts), that's the start: the share of its gamerscore still to earn, of IGDB's
// time, adjusted by how fast this player is going compared with IGDB's players (from 0.5× to 2×). With too little
// play time in the game, their usual speed across their other games is used (from 0.75× to 1.5×). With only a time
// to the credits, 100% is taken as 1.5× that.
//
// Hours to 100% over 300 on IGDB (endless multiplayer games, where players log time played) are ignored.
//
// Otherwise each unfinished game is projected from the player's own pace: if 40% of its
// gamerscore took 20 hours, the other 60% should take about 30. Gamerscore is a rough gauge of how far through a game
// someone is, so these are estimates to 100%, not to the end of the story. Games with too little play to go on
// (Xbox 360 games have no play time at all), or under 20% done, use the player's typical hours per 100%: the median
// of their finished games, kept between 10 and 60 hours so one multiplayer game at 100% after thousands of hours
// can't set it for everything else. No single game is projected past CAP, whichever way it's estimated, since a
// sports or live-service game can take hundreds of hours for a sliver of its gamerscore.

const DAY = 86400000;
const WEEK = 7 * DAY;
const FALLBACK_COMPLETION = 40;
const MIN_COMPLETION = 10;
const MAX_COMPLETION = 60;
// No single game is projected past this many hours.
const CAP = 150;
const MIN_PACE = 20;
// Times to 100% are logged far less than times to the credits; with only the latter, 100% is taken as half as long again.
const STORY_TO_FULL = 1.5;
const MIN_SPEED = 0.5;
const MAX_SPEED = 2;
// A barely started game borrows the player's usual speed from their other games, within a narrower range.
const MIN_USUAL = 0.75;
const MAX_USUAL = 1.5;

export interface BacklogGame {
  id: string;
  title: string;
  image: string | null;
  poster: string | null;
  // Hours left to 100%, rounded to the half hour.
  left: number;
  progress: number;
  playedHours: number | null;
  // 'igdb' when from IGDB's time to 100%, 'pace' when projected from the game's own play time and progress, 'average'
  // when from the player's typical 100%.
  source: 'igdb' | 'pace' | 'average';
  lastTouched: number;
}

export interface Backlog {
  games: BacklogGame[];
  total: number;
  // Hours a week this player usually plays, from their first unlock to today; null with no play time.
  perWeek: number | null;
  // Hours a typical 100% takes them, the fallback for games with too little to go on.
  perCompletion: number;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const half = (h: number) => Math.max(0.5, Math.round(h * 2) / 2);
export const lastTouch = (g: Game) => Math.max(g.lastPlayed ?? 0, g.lastUnlock ?? 0);

export function backlogOf(p: XboxProfile, now = Date.now()): Backlog | null {
  const done = p.games.filter((g) => g.achievements && g.achievements.maxScore > 0 && g.achievements.progress >= 100 && (g.playMin ?? 0) > 0);
  const perCompletion = Math.min(MAX_COMPLETION, Math.max(MIN_COMPLETION, median(done.map((g) => g.playMin! / 60)) ?? FALLBACK_COMPLETION));
  const open = p.games.filter((g) => g.achievements && g.achievements.maxScore > 0 && g.achievements.score > 0 && g.achievements.progress < 100);
  const fullOf = (g: Game) => g.timeToBeat?.complete ?? (g.timeToBeat?.story ? g.timeToBeat.story * STORY_TO_FULL : null);
  const clampSpeed = (x: number) => Math.min(MAX_SPEED, Math.max(MIN_SPEED, x));
  // How long this player takes against IGDB's players, game by game where both are known.
  const speedOf = (g: Game) => {
    const full = fullOf(g);
    const pr = g.achievements!.progress;
    const played = g.playMin ? g.playMin / 60 : 0;
    return full && played >= 0.5 && pr >= MIN_PACE ? played / ((full * pr) / 100) : null;
  };
  const usual = Math.min(MAX_USUAL, Math.max(MIN_USUAL, median(open.map(speedOf).filter((x): x is number => x !== null)) ?? 1));
  const games: BacklogGame[] = [];
  for (const g of open) {
    const a = g.achievements!;
    const pr = Math.max(1, a.progress);
    const played = g.playMin ? g.playMin / 60 : null;
    const full = fullOf(g);
    // Under 20% the gamerscore says little about how far through a game someone is, so the average is used.
    const byPace = played !== null && played >= 0.5 && pr >= MIN_PACE;
    const speed = speedOf(g);
    const source: BacklogGame['source'] = full ? 'igdb' : byPace ? 'pace' : 'average';
    const raw =
      source === 'igdb'
        ? ((full! * (100 - pr)) / 100) * (speed === null ? usual : clampSpeed(speed))
        : source === 'pace'
          ? (played! * (100 - pr)) / pr
          : (perCompletion * (100 - pr)) / 100;
    const left = Math.min(CAP, raw);
    games.push({
      id: g.id,
      title: g.title,
      image: g.icon,
      poster: g.art ?? g.icon,
      left: half(left),
      progress: a.progress,
      playedHours: played,
      source,
      lastTouched: lastTouch(g),
    });
  }
  if (!games.length) return null;
  games.sort((a, b) => a.left - b.left || b.progress - a.progress);
  const total = games.reduce((s, g) => s + g.left, 0);
  const hours = p.games.reduce((s, g) => s + (g.playMin ?? 0), 0) / 60;
  const first = Math.min(...p.games.map((g) => g.firstUnlock ?? Infinity), ...p.unlocks.map((u) => u.at));
  // Without unlock dates (OpenXBL), the years on Xbox from the tenure badge give the span instead.
  const weeks = Number.isFinite(first) ? Math.max(4, (now - first) / WEEK) : p.tenure ? p.tenure * 52 : null;
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
