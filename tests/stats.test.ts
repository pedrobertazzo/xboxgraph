import { describe, expect, it } from 'vitest';
import { PRESETS, presetRows } from '@/lib/presets';
import { sampleProfile } from '@/lib/sample';
import { milestone, xboxStats, yearShown } from '@/lib/stats';
import type { Game, Unlock, XboxProfile } from '@/lib/types';

const NOW = Date.UTC(2026, 10, 9, 12);
const DAY = 86400000;
const sample = sampleProfile(NOW);

const game = (over: Partial<Game> = {}): Game => ({
  id: 'g',
  title: 'Game',
  platforms: ['Series X|S'],
  icon: null,
  art: null,
  playMin: 600,
  lastPlayed: NOW - DAY,
  firstUnlock: NOW - 100 * DAY,
  lastUnlock: NOW - DAY,
  genres: ['Shooter'],
  released: Date.UTC(2024, 0, 1),
  achievements: { earned: 20, total: 40, score: 550, maxScore: 1000, progress: 55 },
  ...over,
});
const done = (over: Partial<Game> = {}) => game({ achievements: { earned: 40, total: 40, score: 1000, maxScore: 1000, progress: 100 }, ...over });
const unlock = (over: Partial<Unlock> = {}): Unlock => ({ titleId: 'g', name: 'A', at: NOW - DAY, score: 10, rarity: 50, icon: null, ...over });

const profile = (games: Game[], over: Partial<XboxProfile> = {}): XboxProfile => ({
  id: 'me',
  name: 'Me',
  xuid: '1',
  avatar: null,
  gamerscore: games.reduce((s, g) => s + (g.achievements?.score ?? 0), 0),
  tier: null,
  bio: null,
  location: null,
  tenure: null,
  games,
  unlocks: [],
  unlocksCapped: false,
  playHidden: false,
  unlocksHidden: false,
  ...over,
});
const stat = (p: XboxProfile, key: string, now = NOW) => xboxStats(p, now).find((s) => s.key === key);

describe('the sample profile', () => {
  const stats = xboxStats(sample, NOW);

  it('has every stat, so every preset row fills', () => {
    const placed = new Set(PRESETS.flatMap((p) => presetRows(p).flatMap((r) => r.prefer)));
    expect(new Set(stats.map((s) => s.key))).toEqual(placed);
  });

  it('gives every stat a headline, a line and a sane progress', () => {
    for (const s of stats) {
      expect(s.display, s.key).toBeTruthy();
      expect(s.line.length, s.key).toBeGreaterThan(20);
      expect(s.progress.max, s.key).toBeGreaterThan(0);
      expect(Number.isFinite(s.value), s.key).toBe(true);
    }
  });

  it('adds its gamerscore up from its games', () => {
    expect(sample.gamerscore).toBe(sample.games.reduce((s, g) => s + g.achievements!.score, 0));
    for (const g of sample.games) expect(g.achievements!.score, g.title).toBeLessThanOrEqual(g.achievements!.maxScore);
  });
});

describe('stats', () => {
  it('finds the next gamerscore milestone', () => {
    expect(milestone(0)).toMatchObject({ prev: 0, next: 1000, club: 'Getting started' });
    expect(milestone(12_430)).toMatchObject({ prev: 10_000, next: 25_000, club: '10K club' });
    expect(milestone(2_500_000).next).toBe(3_000_000);
  });

  it('finds games close to 100%, closest first', () => {
    const at = (id: string, progress: number) => game({ id, title: id, achievements: { earned: progress, total: 100, score: progress * 10, maxScore: 1000, progress } });
    const s = stat(profile([at('A', 55), at('B', 92), at('C', 75), done({ id: 'D' })]), 'almost')!;
    expect(s.series.map((e) => e.label)).toEqual(['B', 'C']);
    expect(s.progress.label).toMatch(/B: 8 achievements to go/);
  });

  it('counts games at 100% and the finish rate', () => {
    const p = profile([done({ id: 'a' }), done({ id: 'b' }), game({ id: 'c' }), game({ id: 'd' })]);
    expect(stat(p, 'completed')!.value).toBe(2);
    expect(stat(p, 'finishrate')!.display).toBe('50%');
  });

  it('skips play time when there is none', () => {
    const keys = xboxStats(profile([game({ playMin: null })]), NOW).map((s) => s.key);
    expect(keys).not.toContain('playtime');
    expect(keys).not.toContain('instead');
    expect(keys).toContain('gamerscore');
  });

  it('projects hours left from the player’s own pace, quickest first', () => {
    const g = (id: string, hrs: number | null, progress: number) => game({ id, title: id, playMin: hrs === null ? null : hrs * 60, achievements: { earned: 10, total: 40, score: progress * 10, maxScore: 1000, progress } });
    const full = done({ id: 'P', title: 'P', playMin: 30 * 60 });
    const s = stat(profile([g('Half', 10, 50), g('Quarter', 10, 25), g('Old', null, 40), full]), 'backlog')!;
    // Half: 10 h for 50% → 10 h left. Quarter: 10 h for 25% → 30 h. Old (no play time): 60% of the 30 h average → 18 h.
    expect(s.series.map((e) => [e.label, e.value])).toEqual([['Half', 10], ['Old', 18], ['Quarter', 30]]);
    expect(s.value).toBe(58);
    expect(s.backlog?.averaged).toBe(1);
  });

  it('ranks the rarest achievements and splits unlocks by rarity', () => {
    const unlocks = [0.5, 3, 8, 20, 60, 70, 80, 90, 95, 99].map((rarity, i) => unlock({ name: `U${i}`, rarity }));
    const p = profile([game()], { unlocks });
    const r = stat(p, 'rarest')!;
    expect(r.display).toBe('0.5%');
    expect(r.series[0].label).toBe('U0');
    expect(r.progress.value).toBe(2);
    const mix = stat(p, 'rarity')!;
    expect(mix.series.map((e) => e.value)).toEqual([1, 1, 1, 1, 6]);
    expect(mix.display).toBe('30%');
  });

  it('finds the busiest hour on the viewer’s clock', () => {
    const unlocks = Array.from({ length: 30 }, (_, i) => unlock({ at: Date.UTC(2026, 9, 1 + i, i < 20 ? 20 : 9) }));
    const p = profile([game()], { unlocks });
    expect(xboxStats(p, NOW, { tz: 'UTC', h12: true }).find((s) => s.key === 'when')!.display).toBe('8 PM');
    expect(xboxStats(p, NOW, { tz: 'Asia/Tokyo', h12: false }).find((s) => s.key === 'when')!.display).toBe('05:00');
  });

  it('draws a 26-week calendar with the longest streak', () => {
    const unlocks = [1, 2, 3, 4, 10, 30].map((d) => unlock({ at: NOW - d * DAY }));
    const s = stat(profile([game()], { unlocks }), 'calendar')!;
    expect(s.heat).toMatchObject({ rows: 7, cols: 26 });
    expect(s.value).toBe(6);
    expect(s.progress.label).toMatch(/4 days in a row/);
    expect(s.heat!.values.filter((v) => v > 0).reduce((a, b) => a + b, 0)).toBe(6);
  });

  it('shows the year so far, and the whole previous year all through January', () => {
    expect(yearShown(Date.UTC(2026, 10, 9))).toEqual({ year: 2026, review: false });
    expect(yearShown(Date.UTC(2027, 0, 31, 23))).toEqual({ year: 2026, review: true });
    expect(yearShown(Date.UTC(2027, 1, 1))).toEqual({ year: 2027, review: false });
    const jan = Date.UTC(2027, 0, 3);
    const p = profile([game({ firstUnlock: Date.UTC(2026, 2, 1) })], { unlocks: [unlock({ at: Date.UTC(2026, 11, 20), score: 30 }), unlock({ at: Date.UTC(2025, 5, 1), score: 99 })] });
    const s = stat(p, 'thisyear', jan)!;
    expect(s.title).toBe('Your 2026 in review');
    expect(s.series).toHaveLength(12);
    expect(s.display).toBe('30G');
  });

  it('weights genres and eras by hours', () => {
    const p = profile([game({ id: 'a', genres: ['Shooter'], playMin: 600 }), game({ id: 'b', genres: ['Racing'], playMin: 200, released: Date.UTC(2009, 0, 1) }), game({ id: 'c', genres: ['Shooter'], playMin: 200 })]);
    expect(stat(p, 'genres')!.display).toBe('Shooter');
    expect(stat(p, 'genres')!.value).toBe(80);
    expect(stat(p, 'eras')!.series.map((e) => e.label)).toEqual(['00s', '20s']);
  });

  it('counts gamerscore per hour, quickest games first', () => {
    const g = (id: string, hrs: number, score: number) => game({ id, title: id, playMin: hrs * 60, achievements: { earned: 5, total: 40, score, maxScore: 1000, progress: score / 10 } });
    const s = stat(profile([g('Slow', 50, 100), g('Fast', 2, 100), g('Mid', 10, 100)]), 'scorerate')!;
    expect(s.series.map((e) => e.label)).toEqual(['Fast', 'Mid', 'Slow']);
    expect(s.value).toBeCloseTo(300 / 62);
  });

  it('maps when new games were started, by year and month', () => {
    const at = (y: number, m: number) => game({ firstUnlock: Date.UTC(y, m, 10) });
    const s = stat(profile([at(2025, 11), at(2024, 11), at(2026, 2), at(2026, 11)]), 'starts')!;
    expect(s.display).toBe('Dec');
    expect(s.heat!.cols).toBe(12);
    expect(s.heat!.values.at(-1)).toBe(-1);
  });
});
