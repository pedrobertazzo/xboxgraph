import { attachUnlocks } from './xbox';
import type { Game, Platform, Unlock, XboxProfile } from './types';

// A made-up achievement hunter with made-up games and generated cover art (public/sample), so the landing page and
// /profile/sample need no Xbox calls. Dates count back from today; numbers come from a fixed seed.

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Title, platforms, genre, release year, hours, achievements on offer, gamerscore on offer, share unlocked, days idle.
type Def = [string, Platform[], string, number, number, number, number, number, number];
const SX: Platform[] = ['Series X|S', 'PC'];
const ONE: Platform[] = ['Xbox One', 'Series X|S'];
const DEFS: Def[] = [
  ['Ashen Crown', SX, 'Role playing', 2024, 212, 62, 1000, 1, 3],
  ['Neon Drift 2', SX, 'Racing & flying', 2025, 96, 50, 1000, 1, 1],
  ['Hollow Orbit', SX, 'Action & adventure', 2023, 64, 40, 1000, 1, 40],
  ['Kingdom of Salt', ONE, 'Strategy', 2019, 148, 75, 1500, 0.94, 12],
  ['Tidebreaker', SX, 'Shooter', 2024, 41, 36, 1000, 1, 95],
  ['Paper Samurai', ONE, 'Fighting', 2018, 27, 30, 1000, 1, 220],
  ['Low Gravity Golf', SX, 'Sports', 2025, 19, 40, 1000, 0.6, 6],
  ['The Long Static', SX, 'Action & adventure', 2026, 33, 32, 1000, 0.9, 18],
  ['Moss & Mortar', ONE, 'Puzzle & trivia', 2017, 58, 45, 1250, 1, 300],
  ['Starlit Courier', ['PC'], 'Platformer', 2022, 22, 30, 1000, 0.95, 25],
  ['Grim Harvest', ONE, 'Shooter', 2016, 11, 50, 1000, 0.12, 410],
  ['Pixel Parade', SX, 'Family & kids', 2025, 1.5, 25, 1000, 0.04, 160],
  ['Deepwater Siege', ONE, 'Shooter', 2020, 74, 60, 1500, 0.88, 60],
  ['Last Lantern', ['Xbox 360'], 'Action & adventure', 2009, 0, 50, 1000, 1, 1500],
  ['Velocity Kings', ['Xbox 360'], 'Racing & flying', 2011, 0, 45, 1000, 0.35, 1900],
  ['Quiet Valley', SX, 'Simulation', 2024, 0.6, 20, 1000, 0.03, 120],
];

const slug = (t: string) => t.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');
const WORDS = ['First Steps', 'Getting Warm', 'Sharpshooter', 'Untouchable', 'Night Shift', 'Collector', 'Long Haul', 'No Detours', 'Hidden Path', 'Photo Finish', 'Clean Sweep', 'Iron Will', 'Lucky Break', 'Off the Map', 'The Long Way', 'Speed Demon', 'Perfectionist', 'Patience', 'Full House', 'Master Class'];

export function sampleProfile(now = Date.now()): XboxProfile {
  const r = rng(20261110);
  const today = Math.floor(now / 86400000) * 86400000;
  const unlocks: Unlock[] = [];
  const games: Game[] = DEFS.map(([title, platforms, genre, year, hrs, total, maxScore, share, idle], i) => {
    const id = String(1_800_000_000 + i * 7919);
    const earned = Math.max(1, Math.round(total * share));
    // Scores step up from 5G to 100G; the last few are the big ones, so a game's score tracks its share.
    const weights = Array.from({ length: total }, (_, k) => 1 + (k / total) * 3);
    const wsum = weights.reduce((a, b) => a + b, 0);
    const scores = weights.map((w) => Math.max(5, Math.round(((w / wsum) * maxScore) / 5) * 5));
    const fix = maxScore - scores.reduce((a, b) => a + b, 0);
    scores[scores.length - 1] = Math.max(5, scores[scores.length - 1] + fix);
    const last = today - idle * 86400000 + Math.floor(r() * 20) * 3600_000;
    const spanDays = 2 + Math.floor(r() * (hrs ? Math.min(120, hrs / 1.5) : 40));
    const evening = () => (r() < 0.65 ? 18 + Math.floor(r() * 6) : r() < 0.5 ? Math.floor(r() * 3) : 9 + Math.floor(r() * 8)) * 3600_000 + Math.floor(r() * 60) * 60_000;
    let score = 0;
    // Xbox 360 unlocks aren't in the modern unlock list, so they're left out of it here too.
    const modern = !platforms.includes('Xbox 360');
    for (let k = 0; k < earned; k++) {
      score += scores[k];
      if (!modern) continue;
      const rarity = Math.round(Math.max(0.1, (k / total) ** 1.6 > 0.9 ? 0.2 + r() * 3 : 70 * (1 - k / total) ** 1.4 + r() * 8) * 10) / 10;
      unlocks.push({
        titleId: id,
        name: `${WORDS[(i * 3 + k) % WORDS.length]}${k >= WORDS.length ? ` ${Math.floor(k / WORDS.length) + 1}` : ''}`,
        at: Math.floor((last - (1 - k / earned) * spanDays * 86400000) / 86400000) * 86400000 + evening(),
        score: scores[k],
        rarity,
        icon: null,
      });
    }
    const art = `/sample/${slug(title)}.svg`;
    return {
      id,
      title,
      platforms,
      icon: art,
      art,
      playMin: hrs ? Math.round(hrs * 60) : null,
      lastPlayed: last,
      firstUnlock: null,
      lastUnlock: null,
      genres: [genre],
      released: Date.UTC(year, (i * 5) % 12, 1 + ((i * 7) % 27)),
      achievements: { earned, total, score, maxScore, progress: Math.min(100, Math.round((score / maxScore) * 100)) },
    };
  });
  unlocks.sort((a, b) => b.at - a.at);
  attachUnlocks(games, unlocks);
  return {
    id: 'sample',
    name: 'SampleHunter',
    xuid: '0',
    avatar: null,
    gamerscore: games.reduce((s, g) => s + (g.achievements?.score ?? 0), 0),
    tier: 'Gold',
    bio: null,
    location: null,
    tenure: 9,
    games,
    unlocks,
    unlocksCapped: false,
    playHidden: false,
    unlocksHidden: false,
  };
}

// A second made-up player for the compare demo (/compare/sample/samplerival): fewer games, less finished, fewer hours.
export function sampleRival(now = Date.now()): XboxProfile {
  const base = sampleProfile(now);
  const keep = new Set<string>();
  const games = base.games
    .filter((_, i) => i % 3 !== 1)
    .map((g, i) => {
      keep.add(g.id);
      if (!g.achievements) return g;
      const full = i % 4 === 0;
      const scale = full ? 1 : 0.35 + (i % 5) * 0.1;
      const a = g.achievements;
      const earned = Math.max(1, Math.round(a.earned * scale));
      const score = full ? a.score : Math.max(5, Math.round((a.score * scale) / 5) * 5);
      return { ...g, playMin: g.playMin ? Math.round(g.playMin * (0.4 + (i % 3) * 0.3)) : null, achievements: { ...a, earned, score, progress: Math.round((score / a.maxScore) * 100) } };
    });
  const unlocks = base.unlocks.filter((u, i) => keep.has(u.titleId) && i % 3 !== 0);
  return { ...base, id: 'samplerival', name: 'SampleRival', tier: 'Silver', tenure: 4, gamerscore: games.reduce((s, g) => s + (g.achievements?.score ?? 0), 0), games, unlocks };
}
