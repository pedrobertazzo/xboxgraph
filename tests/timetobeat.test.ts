import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanTitle, pick } from '@/lib/timetobeat';
import type { Game } from '@/lib/types';

describe('cleaning Xbox titles for IGDB', () => {
  it.each([
    ['FIFA 21 Xbox One', 'FIFA 21'],
    ['Grand Theft Auto V (Xbox One)', 'Grand Theft Auto V'],
    ['Mafia: Definitive Edition for XBOX One', 'Mafia: Definitive Edition'],
    ['EA SPORTS FIFA 23 Standard Edition Xbox Series X|S', 'EA SPORTS FIFA 23'],
    ['Grand Theft Auto Online (Xbox Series X|S)', 'Grand Theft Auto Online'],
    ['Forza Horizon 4 Standard Edition', 'Forza Horizon 4'],
    ['Ryse: Son of Rome', 'Ryse: Son of Rome'],
    ['Halo: The Master Chief Collection', 'Halo: The Master Chief Collection'],
  ])('%s → %s', (raw, clean) => expect(cleanTitle(raw)).toBe(clean));
});

describe('picking the IGDB game', () => {
  it('takes the exact name, preferring an Xbox or PC release', () => {
    const found = [
      { id: 1, name: 'Ryse: Son of Rome', platforms: [48] },
      { id: 2, name: 'Ryse: Son of Rome', platforms: [49] },
    ];
    expect(pick('Ryse: Son of Rome', found)).toBe(2);
  });

  it('matches through sponsor prefixes and subtitles', () => {
    expect(pick('EA SPORTS FIFA 23 Standard Edition Xbox Series X|S', [{ id: 7, name: 'FIFA 23', platforms: [169] }])).toBe(7);
    expect(pick("Tom Clancy's Rainbow Six Siege", [{ id: 8, name: 'Tom Clancy’s Rainbow Six Siege', platforms: [6] }])).toBe(8);
  });

  it('reads Roman numerals as numbers', () => {
    expect(pick('Outlast 2', [{ id: 5, name: 'Outlast II', platforms: [49] }])).toBe(5);
  });

  it('calls a loose search hit a miss rather than the wrong game', () => {
    expect(pick('Among Us', [{ id: 9, name: 'Among the Sleep', platforms: [49] }])).toBeNull();
  });
});

describe('looking up a profile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const game = (id: string, title: string): Game => ({
    id,
    title,
    platforms: ['Xbox One'],
    icon: null,
    art: null,
    playMin: 60,
    lastPlayed: 1,
    firstUnlock: null,
    lastUnlock: null,
    genres: [],
    released: null,
    achievements: { earned: 1, total: 40, score: 50, maxScore: 1000, progress: 5 },
  });

  it('matches names in one multi-query, searches only the rest, reads the times in one request and caches misses', async () => {
    vi.resetModules();
    vi.stubEnv('TWITCH_CLIENT_ID', 'id');
    vi.stubEnv('TWITCH_CLIENT_SECRET', 'secret');
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push(url.replace(/\?.*/, ''));
        if (url.startsWith('https://id.twitch.tv')) return Response.json({ access_token: 't', expires_in: 5_000_000 });
        if (url.endsWith('/multiquery'))
          return Response.json([
            { name: 'q0', result: [{ id: 100, name: 'Ryse: Son of Rome', platforms: [49] }] },
            { name: 'q1', result: [] },
          ]);
        // Only the game the name filter found nothing for gets a text search, which finds nothing close.
        if (url.endsWith('/games')) {
          expect(String(init.body)).toContain('search "Obscure Game"');
          return Response.json([{ id: 200, name: 'Something Else', platforms: [49] }]);
        }
        expect(String(init.body)).toContain('where game_id = (100)');
        return Response.json([{ game_id: 100, normally: 8 * 3600, completely: 17.5 * 3600 }]);
      }),
    );
    const { timeToBeat } = await import('@/lib/timetobeat');
    const games = [game('1', 'Ryse: Son of Rome'), game('2', 'Obscure Game (Xbox One)')];
    await timeToBeat(games);
    expect(games[0].timeToBeat).toEqual({ story: 8, complete: 17.5 });
    expect(games[1].timeToBeat).toBeNull();
    expect(calls).toEqual(['https://id.twitch.tv/oauth2/token', 'https://api.igdb.com/v4/multiquery', 'https://api.igdb.com/v4/games', 'https://api.igdb.com/v4/game_time_to_beats']);

    // A second profile with the same games is answered from the cache, the miss included.
    const again = [game('1', 'Ryse: Son of Rome'), game('2', 'Obscure Game (Xbox One)')];
    await timeToBeat(again);
    expect(again[0].timeToBeat).toEqual({ story: 8, complete: 17.5 });
    expect(again[1].timeToBeat).toBeNull();
    expect(calls).toHaveLength(4);
  });

  it('does nothing without Twitch keys, and never throws when IGDB is down', async () => {
    vi.resetModules();
    const f = vi.fn(async () => new Response('down', { status: 500 }));
    vi.stubGlobal('fetch', f);
    let mod = await import('@/lib/timetobeat');
    await mod.timeToBeat([game('1', 'Ryse')]);
    expect(f).not.toHaveBeenCalled();

    vi.resetModules();
    vi.stubEnv('TWITCH_CLIENT_ID', 'id');
    vi.stubEnv('TWITCH_CLIENT_SECRET', 'secret');
    mod = await import('@/lib/timetobeat');
    const g = game('3', 'Ryse');
    await expect(mod.timeToBeat([g])).resolves.toBe(false);
    expect(g.timeToBeat).toBeUndefined();
  });
});
