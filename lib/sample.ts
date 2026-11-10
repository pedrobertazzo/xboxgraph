import { attachUnlocks, source } from './xbox';
import type { Game, Platform, Unlock, XboxProfile } from './types';

// A made-up achievement hunter playing real games, so the landing page and /profile/sample need no Xbox Live calls.
// The games, genres and box art are real (art from Microsoft's store catalogue); the player's hours, achievements and
// dates are made up. Dates count back from today; numbers come from a fixed seed.

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
  ['ELDEN RING', SX, 'Action & adventure', 2022, 212, 42, 1000, 1, 3],
  ['Forza Horizon 5', [...ONE, 'PC'], 'Racing & flying', 2021, 96, 50, 1000, 1, 1],
  ['Halo Infinite', SX, 'Shooter', 2021, 64, 60, 1000, 0.62, 6],
  ['Starfield', SX, 'Role playing', 2023, 148, 50, 1000, 0.94, 12],
  ['Hades', [...ONE, 'PC'], 'Action & adventure', 2021, 41, 49, 1000, 1, 95],
  ['Cuphead', ONE, 'Platformer', 2017, 27, 28, 1000, 1, 220],
  ['Sea of Thieves', [...ONE, 'PC'], 'Action & adventure', 2018, 19, 50, 1000, 0.6, 40],
  ['Indiana Jones and the Great Circle', SX, 'Action & adventure', 2024, 33, 32, 1000, 0.9, 18],
  ['Stardew Valley', ONE, 'Simulation', 2016, 58, 40, 1000, 1, 300],
  ['Hollow Knight: Silksong', SX, 'Platformer', 2025, 22, 30, 1000, 0.95, 25],
  ['Gears 5', ONE, 'Shooter', 2019, 11, 50, 1000, 0.12, 410],
  ['Vampire Survivors', SX, 'Action & adventure', 2022, 1.5, 25, 1000, 0.04, 160],
  ['Fallout 4', ONE, 'Role playing', 2015, 74, 60, 1500, 0.88, 60],
  ['Fable II', ['Xbox 360'], 'Role playing', 2008, 0, 50, 1000, 1, 1500],
  ['Mass Effect 2', ['Xbox 360'], 'Role playing', 2010, 0, 45, 1000, 0.35, 1900],
  ['Palworld', SX, 'Action & adventure', 2024, 0.6, 20, 1000, 0.03, 120],
  ['Microsoft Flight Simulator', SX, 'Simulation', 2020, 30, 40, 1000, 0.22, 200],
];

// Box art (square) and poster (portrait) for each game, from the Xbox store catalogue.
const ART: Record<string, [string, string]> = {
  'ELDEN RING': ['https://store-images.s-microsoft.com/image/apps.45643.14537704372270848.6ecb6038-5426-409a-8660-158d1eb64fb0.65bbc29b-4f5d-4381-a62a-9b6178d2f342?w=300', 'https://store-images.s-microsoft.com/image/apps.25322.14537704372270848.6ecb6038-5426-409a-8660-158d1eb64fb0.d230176a-d7a2-4696-ad23-ff53a6e004df?w=400'],
  'Forza Horizon 5': ['https://store-images.s-microsoft.com/image/apps.6614.13806078025361171.9723cf5e-1e29-4d9d-ad0a-cc37a95bb75d.b5dcb363-3613-4901-bf2d-f19c13b54a3d?w=300', 'https://store-images.s-microsoft.com/image/apps.23625.13806078025361171.9723cf5e-1e29-4d9d-ad0a-cc37a95bb75d.e02f4ead-d89b-45cd-8eb5-5dcbf44ae91f?w=400'],
  'Halo Infinite': ['https://store-images.s-microsoft.com/image/apps.30769.13727851868390641.270e98c5-0c6a-4ce0-81ab-e78c700bf4b5.092f9454-fee6-43b1-94e3-802dd0067d8b?w=300', 'https://store-images.s-microsoft.com/image/apps.21536.13727851868390641.c9cc5f66-aff8-406c-af6b-440838730be0.68796bde-cbf5-4eaa-a299-011417041da6?w=400'],
  'Starfield': ['https://store-images.s-microsoft.com/image/apps.1647.13567343664224659.1eb6fdf9-8a0b-4344-a135-ab17dfa3c609.39331391-9de2-48f8-8643-8eb1bd964383?w=300', 'https://store-images.s-microsoft.com/image/apps.35187.13567343664224659.1eb6fdf9-8a0b-4344-a135-ab17dfa3c609.c83b6d6a-56c3-4c3f-8b31-456cfb21c3b7?w=400'],
  'Hades': ['https://store-images.s-microsoft.com/image/apps.22093.14093828725404571.e8c4fd85-da7e-4c33-9a85-c97c9f3eeb38.ac9d973d-36f6-4dfa-a73a-8db519fe3d88?w=300', 'https://store-images.s-microsoft.com/image/apps.48496.14093828725404571.e8c4fd85-da7e-4c33-9a85-c97c9f3eeb38.fde6f3ed-4a08-4bb8-8240-9cd19e049803?w=400'],
  'Cuphead': ['https://store-images.s-microsoft.com/image/apps.59330.13527301958862136.ffa8c20b-226b-443c-8d6c-cce51dca9945.038813e4-508d-4cbd-9d97-cb8f9134099c?w=300', 'https://store-images.s-microsoft.com/image/apps.36678.13527301958862136.ffa8c20b-226b-443c-8d6c-cce51dca9945.7170663c-a4e2-46db-a81b-aa22c30d6d44?w=400'],
  'Sea of Thieves': ['https://store-images.s-microsoft.com/image/apps.1953.14554784103656548.069efce3-9249-4074-a169-183b727043f8.2d796a4d-6b1a-452d-8172-5b6edb68fc3c?w=300', 'https://store-images.s-microsoft.com/image/apps.29206.14554784103656548.069efce3-9249-4074-a169-183b727043f8.03688f8c-edc0-416b-bebb-9d98a01c25f5?w=400'],
  'Indiana Jones and the Great Circle': ['https://store-images.s-microsoft.com/image/apps.475.14050533476382116.9ce9be62-6690-4c40-8e76-7e5af2a256fb.890d72d8-ceb4-4c0d-9653-e9fbcfeb27c7?w=300', 'https://store-images.s-microsoft.com/image/apps.394.14050533476382116.9ce9be62-6690-4c40-8e76-7e5af2a256fb.23519966-541f-46af-94a3-68d956e7cf85?w=400'],
  'Stardew Valley': ['https://store-images.s-microsoft.com/image/apps.49352.65985311967005000.4f51b5e9-febf-4990-8951-33ba59b634c9.aace9b9e-b001-46eb-a39b-08b1332810aa?w=300', 'https://store-images.s-microsoft.com/image/apps.44413.65985311967005000.4f51b5e9-febf-4990-8951-33ba59b634c9.924253ef-36b2-4cc0-8bb1-9a97c88d4828?w=400'],
  'Hollow Knight: Silksong': ['https://store-images.s-microsoft.com/image/apps.40391.13915115277924383.ab2daab8-cb71-4e1a-ad73-9e4a3e87c3f3.960a3fa2-5987-49b8-9d15-602af0a1ff93?w=300', 'https://store-images.s-microsoft.com/image/apps.21346.13915115277924383.ab2daab8-cb71-4e1a-ad73-9e4a3e87c3f3.508fc374-c9ac-44bf-b71a-9d4b29515e2f?w=400'],
  'Gears 5': ['https://store-images.s-microsoft.com/image/apps.45218.65494054591008504.7da34730-f3b8-4554-bade-55b9bc0b3e41.458705a0-4446-4d96-8ed3-4c46531bbe85?w=300', 'https://store-images.s-microsoft.com/image/apps.10933.65494054591008504.4eae27ba-1cfe-4af2-950a-4af81f8cd22a.b5b2909d-8884-48d0-b25a-68d6518c9b73?w=400'],
  'Vampire Survivors': ['https://store-images.s-microsoft.com/image/apps.60062.14160661575041057.92e444db-ebb1-4665-8e17-3322a7fae71d.e4e983fc-203e-4894-87ac-a7cd35993538?w=300', 'https://store-images.s-microsoft.com/image/apps.1373.14160661575041057.92e444db-ebb1-4665-8e17-3322a7fae71d.4492fd1a-717e-4a94-8ace-7c747845bed6?w=400'],
  'Fallout 4': ['https://store-images.s-microsoft.com/image/apps.39982.66091604408099736.7f81588d-a4e2-49c1-b49d-b774ce2d8edb.bad9ecbd-69b6-42d5-8449-071c2137bc81?w=300', 'https://store-images.s-microsoft.com/image/apps.50286.66091604408099736.4cc75ea1-c6a0-40ec-b7f9-7fdb8da581b2.124090f5-4333-4929-af8b-62b4331439d4?w=400'],
  'Fable II': ['https://store-images.s-microsoft.com/image/apps.12706.66274487452813675.86971dec-0f03-42bb-b657-322859f064f4.5b8be489-c377-4439-a4a5-5564da9a165b?w=300', 'https://store-images.s-microsoft.com/image/apps.4730.66274487452813675.86971dec-0f03-42bb-b657-322859f064f4.130a3c09-259d-4961-8a49-70176caf3c2b?w=400'],
  'Mass Effect 2': ['https://store-images.s-microsoft.com/image/apps.53658.65104284338300891.dcd8a095-2ff3-4393-acfc-5bd52cf20770.9d28b9cc-902b-4c5d-b776-67da57da5336?w=300', 'https://store-images.s-microsoft.com/image/apps.33075.65104284338300891.dcd8a095-2ff3-4393-acfc-5bd52cf20770.748fb136-3a00-4006-90e0-91db959b4f4b?w=400'],
  'Palworld': ['https://store-images.s-microsoft.com/image/apps.45491.13654268679289325.ececb946-5639-4e77-b347-9d188d4e7e02.d4615c02-237f-4ec6-8ec6-a84aaeed586f?w=300', 'https://store-images.s-microsoft.com/image/apps.49778.13654268679289325.ececb946-5639-4e77-b347-9d188d4e7e02.9102215b-349a-4f6d-b9a3-2c14908481f1?w=400'],
  'Microsoft Flight Simulator': ['https://store-images.s-microsoft.com/image/apps.13845.14225646405929875.ed2b05a2-f9fd-4a33-b808-807366c017bf.5f1f24de-445f-4bf0-af0b-cf1de8aec6d5?w=300', 'https://store-images.s-microsoft.com/image/apps.5176.14225646405929875.ed2b05a2-f9fd-4a33-b808-807366c017bf.ec671c43-7121-4f72-b10a-85e5c4b83540?w=400'],
};

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
    const [box, poster] = ART[title];
    return {
      id,
      title,
      platforms,
      icon: box,
      art: poster,
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
  // Through OpenXBL real profiles have no rarity, genres or release dates, so the sample shows none either.
  if (source() === 'openxbl') {
    for (const u of unlocks) u.rarity = null;
    for (const g of games) Object.assign(g, { genres: [], released: null });
  }
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
