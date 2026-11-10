import { describe, expect, it } from 'vitest';
import { compareRows, isComplete, leaders, onlyCompleted, parseIds, sharedGames } from '@/lib/compare';
import { sampleProfile, sampleRival } from '@/lib/sample';

const NOW = Date.UTC(2026, 10, 9, 12);
const a = sampleProfile(NOW);
const b = sampleRival(NOW);

describe('compare', () => {
  it('reads two to four distinct gamertags from the path', () => {
    expect(parseIds(['Alpha', 'beta', 'ALPHA', 'gamma', 'delta', 'epsilon'])).toEqual(['alpha', 'beta', 'gamma', 'delta']);
    expect(parseIds(['Some%20One', 'Tag%231234'])).toEqual(['some one', 'tag#1234']);
  });

  it('puts every head-to-head figure side by side, and names a leader only when there is one', () => {
    const rows = compareRows([a, b]);
    expect(rows.map((r) => r.key)).toEqual(['gamerscore', 'achievements', 'completed', 'completion', 'rare', 'hours', 'games']);
    expect(rows[0].values).toEqual([a.gamerscore, b.gamerscore]);
    expect(rows[0].display[0]).toMatch(/G$/);
    expect(leaders(rows)[0]).toBe(0);
    expect(leaders([{ key: 'x', label: 'x', values: [3, 3], display: [] }])).toEqual([null]);
    expect(leaders([{ key: 'x', label: 'x', values: [0, 0], display: [] }])).toEqual([null]);
  });

  it('drops the rare row when no player has rarity (OpenXBL)', () => {
    const strip = (p: typeof a) => ({ ...p, unlocks: p.unlocks.map((u) => ({ ...u, rarity: null })) });
    expect(compareRows([strip(a), strip(b)]).map((r) => r.key)).not.toContain('rare');
  });

  it('lists the games both players have achievements in, with each one’s progress', () => {
    const shared = sharedGames([a, b]);
    expect(shared.length).toBeGreaterThan(3);
    for (const s of shared) expect(s.progress.every((p) => p != null)).toBe(true);
    expect(sharedGames([a, a].map((p, i) => ({ ...p, games: i ? [] : p.games })))).toEqual([]);
  });

  it('finds 100% games only one player has', () => {
    const [mine, theirs] = onlyCompleted([a, b]);
    expect(mine.length).toBeGreaterThan(0);
    for (const g of mine) expect(b.games.some((h) => h.id === g.id && isComplete(h))).toBe(false);
    expect(theirs).toEqual([]);
  });
});
