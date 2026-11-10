import { Redis } from '@upstash/redis';

// A cache shared by every server copy when Upstash Redis is connected (Vercel's Upstash integration sets
// KV_REST_API_URL and KV_REST_API_TOKEN; a plain Upstash database gives UPSTASH_REDIS_REST_*). Without it, or if
// Redis is unreachable, each copy keeps its own memory cache, as before. Memory is always checked first.
const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;
export const shared = !!redis;

const PREFIX = 'xbl:';
// Upstash refuses entries over 1 MB on its free plan; bigger values (a huge library's profile) stay in memory.
const MAX_SHARED = 900_000;

const memo = new Map<string, { until: number; value: unknown }>();
const MEMO_MAX = 3000;

function remember(key: string, value: unknown, ttl: number) {
  memo.delete(key);
  memo.set(key, { until: Date.now() + ttl, value });
  while (memo.size > MEMO_MAX) memo.delete(memo.keys().next().value!);
}

async function quietly<T>(op: () => Promise<T>): Promise<T | null> {
  try {
    return await op();
  } catch (e) {
    console.warn('[store] Redis unavailable, using memory:', (e as Error).message);
    return null;
  }
}

export async function read<T>(key: string): Promise<T | undefined> {
  const hit = memo.get(key);
  if (hit && hit.until > Date.now()) return hit.value as T;
  if (!redis) return undefined;
  const r = await quietly(async () => {
    const [value, ttl] = await Promise.all([redis.get<T>(PREFIX + key), redis.pttl(PREFIX + key)]);
    return value == null ? null : { value, ttl };
  });
  if (!r) return undefined;
  if (r.ttl > 0) remember(key, r.value, r.ttl);
  return r.value;
}

export async function write(key: string, value: unknown, ttl: number) {
  remember(key, value, ttl);
  if (!redis) return;
  if (JSON.stringify(value).length > MAX_SHARED) return;
  await quietly(() => redis.set(PREFIX + key, value, { px: ttl }));
}

export async function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const hit = await read<T>(key);
  if (hit !== undefined) return hit;
  const value = await load();
  await write(key, value, ttl);
  return value;
}

export const has = async (key: string) => (await read(key)) !== undefined;

// ———————————————————————————————————————— A shared request count
// Requests are counted in 15-minute buckets; the current count weighs the previous bucket by how much of it is still
// inside the last 15 minutes, which approximates a sliding window. A 429 sets a shared pause.

const local = new Map<string, number>();

async function bump(key: string, ttl: number): Promise<void> {
  if (redis) {
    const ok = await quietly(async () => {
      const v = await redis.incr(PREFIX + key);
      if (v === 1) await redis.pexpire(PREFIX + key, ttl);
      return true;
    });
    if (ok) return;
  }
  local.set(key, (local.get(key) ?? 0) + 1);
}

async function count(key: string): Promise<number> {
  if (redis) {
    const n = await quietly(() => redis.get<number>(PREFIX + key));
    if (n != null) return Number(n);
  }
  return local.get(key) ?? 0;
}

export async function used(window: number, now = Date.now()): Promise<number> {
  const bucket = Math.floor(now / window);
  const into = (now % window) / window;
  const [cur, prev] = await Promise.all([count(`budget:${bucket}`), count(`budget:${bucket - 1}`)]);
  return cur + prev * (1 - into);
}

export async function spendOne(window: number, now = Date.now()) {
  await bump(`budget:${Math.floor(now / window)}`, window * 2);
}

export async function pause(ms: number) {
  await write('budget:paused', Date.now() + ms, ms);
}

export async function pausedUntil(): Promise<number> {
  return (await read<number>('budget:paused')) ?? 0;
}
