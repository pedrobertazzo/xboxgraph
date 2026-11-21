import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Game } from '@/lib/types';

const game = (id: string, playMin: number): Game => ({
  id, title: id, platforms: ['Xbox One'], icon: null, art: null, playMin, lastPlayed: 1, firstUnlock: null, lastUnlock: null, genres: [], released: null,
  achievements: { earned: 1, total: 10, score: 10, maxScore: 100, progress: 10 },
});
const product = (dev: string) => Response.json({ Products: [{ LocalizedProperties: [{ DeveloperName: dev }] }] });

describe('store details on a time budget', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('hands back what arrived in time, and a later pass finishes from the cache', async () => {
    vi.resetModules();
    const f = vi.fn(async (url: string) => {
      if (url.includes('value=slow')) await new Promise((r) => setTimeout(r, 200));
      return product(url.includes('value=slow') ? 'Slow Studio' : 'Fast Studio');
    });
    vi.stubGlobal('fetch', f);
    const { enrich } = await import('@/lib/catalog');
    const games = [game('fast', 100), game('slow', 50)];
    expect(await enrich(games, 50)).toBe(false);
    expect(games[0].developer).toBe('Fast Studio');
    expect(games[1].developer).toBeUndefined();

    await new Promise((r) => setTimeout(r, 250));
    expect(games[1].developer).toBeUndefined(); // the late answer isn't written into the handed-back games
    expect(await enrich(games)).toBe(true);
    expect(games[1].developer).toBe('Slow Studio');
    expect(f).toHaveBeenCalledTimes(2); // the second pass came from the cache
  });
});
