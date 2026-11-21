import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

const answer = (map: Record<string, () => Response>) =>
  vi.fn(async (url: string) => {
    const hit = Object.entries(map).find(([k]) => url.startsWith(k));
    return hit ? hit[1]() : new Response('', { status: 404 });
  });

describe('the same name on the sister sites', () => {
  it('lists a public Steam profile and open chess accounts, linking to their grids', async () => {
    vi.stubGlobal(
      'fetch',
      answer({
        'https://steamcommunity.com/id/Ace': () => new Response('<profile><steamID64>76561197964057413</steamID64><privacyState>public</privacyState></profile>'),
        'https://api.chess.com/pub/player/ace': () => Response.json({ username: 'ace', status: 'basic' }),
        'https://lichess.org/api/user/Ace': () => Response.json({ id: 'ace', disabled: true }),
      }),
    );
    const { elsewhere } = await import('@/lib/elsewhere');
    const m = await elsewhere('Ace');
    expect(m.map((x) => x.site)).toEqual(['steam', 'chesscom']);
    expect(m[0].url).toMatch(/^https:\/\/steam\.morphgrid\.io\/profiles\/76561197964057413\?utm_source=xbox\.morphgrid\.io/);
    expect(m[1].url).toMatch(/^https:\/\/chess\.morphgrid\.io\/member\/Ace\?/);
  });

  it('skips private Steam profiles, closed accounts and failed checks', async () => {
    vi.stubGlobal(
      'fetch',
      answer({
        'https://steamcommunity.com/id/Bee': () => new Response('<profile><steamID64>76561197960287930</steamID64><privacyState>friendsonly</privacyState></profile>'),
        'https://api.chess.com/pub/player/bee': () => Response.json({ status: 'closed:fair_play_violations' }),
        'https://lichess.org/api/user/Bee': () => {
          throw new Error('network down');
        },
      }),
    );
    const { elsewhere } = await import('@/lib/elsewhere');
    expect(await elsewhere('Bee')).toEqual([]);
  });

  it('never asks about names the other sites can’t have', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const { elsewhere } = await import('@/lib/elsewhere');
    expect(await elsewhere('Rudi Raser')).toEqual([]);
    expect(await elsewhere('Name#1234')).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });
});
