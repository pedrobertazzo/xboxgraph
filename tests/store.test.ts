import { beforeEach, describe, expect, it, vi } from 'vitest';

// A stand-in for Upstash: one map shared by every "server copy" (each fresh import of lib/store).
const db = new Map<string, { v: unknown; until: number }>();
vi.mock('@upstash/redis', () => ({
  Redis: class {
    async get(k: string) {
      const e = db.get(k);
      return e && e.until > Date.now() ? structuredClone(e.v) : null;
    }
    async pttl(k: string) {
      const e = db.get(k);
      return e ? e.until - Date.now() : -2;
    }
    async set(k: string, v: unknown, o: { px: number }) {
      db.set(k, { v: structuredClone(v), until: Date.now() + o.px });
      return 'OK';
    }
    async incr(k: string) {
      const n = Number(db.get(k)?.v ?? 0) + 1;
      db.set(k, { v: n, until: db.get(k)?.until ?? Infinity });
      return n;
    }
    async pexpire(k: string, ms: number) {
      const e = db.get(k);
      if (e) e.until = Date.now() + ms;
      return 1;
    }
  },
}));

async function copy() {
  vi.resetModules();
  process.env.KV_REST_API_URL = 'https://example.upstash.io';
  process.env.KV_REST_API_TOKEN = 'test';
  return import('@/lib/store');
}

describe('shared store', () => {
  beforeEach(() => db.clear());

  it('lets one server copy reuse what another loaded', async () => {
    const a = await copy();
    const b = await copy();
    const load = vi.fn(async () => ({ name: 'SampleHunter', games: [1, 2, 3] }));
    expect(await a.cached('profile:x', 60_000, load)).toEqual({ name: 'SampleHunter', games: [1, 2, 3] });
    expect(await b.cached('profile:x', 60_000, load)).toEqual({ name: 'SampleHunter', games: [1, 2, 3] });
    expect(load).toHaveBeenCalledTimes(1);
    expect(a.shared).toBe(true);
  });

  it('counts requests across copies, and shares a pause', async () => {
    const a = await copy();
    const b = await copy();
    const W = 15 * 60_000;
    const now = Math.floor(Date.now() / W) * W + 1;
    await a.spendOne(W, now);
    await b.spendOne(W, now);
    await b.spendOne(W, now);
    expect(await a.used(W, now)).toBeCloseTo(3);
    await b.pause(60_000);
    expect(await a.pausedUntil()).toBeGreaterThan(Date.now());
  });

  it('weighs the previous window by how much of it is still recent', async () => {
    const a = await copy();
    const W = 15 * 60_000;
    const start = Math.floor(Date.now() / W) * W;
    for (let i = 0; i < 10; i++) await a.spendOne(W, start - 1);
    expect(await a.used(W, start + W / 2)).toBeCloseTo(5);
  });
});
