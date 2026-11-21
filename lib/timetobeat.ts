import { env } from './env';
import { read, write } from './store';
import type { Game } from './types';

// How long games take to beat, from IGDB (igdb.com, through a Twitch developer app). Each unfinished game is matched
// by its cleaned-up title among IGDB's Xbox and PC games, then its crowd-sourced times are read: to the credits
// ("normally", with some extras) and to 100% ("completely"). Each answer, a miss included, is cached per Xbox title
// ID and shared by every profile that has the game, so a popular game is looked up once a month at most.
//
// IGDB allows 4 requests a second. Multi-queries take no text search, so names are matched 10 to a multi-query by a
// name filter (IGDB's name holding the cleaned title, any case), and only the games that finds nothing for get a text
// search of their own. Times are read for the whole batch in one request. Whatever doesn't fit in the time budget is
// left for the next profile load.

const DAY = 86400000;
const HIT_TTL = 45 * DAY;
const MISS_TTL = 14 * DAY;
// The most games looked up per profile, most recently played first, and how long a profile load waits for IGDB.
const LOOKUPS = 150;
const BUDGET_MS = 6000;
const GAP_MS = 280;
// Players log hours played for endless games (Roblox shows 23,000 hours "to 100%"), so longer times are ignored.
const MAX_COMPLETE = 300;
// IGDB platform IDs: PC, Xbox 360, Xbox One, Xbox Series X|S.
const XBOX_PLATFORMS = new Set([6, 12, 49, 169]);

export type TimeToBeat = {
  // Hours to the credits with some extras, and to 100%; null when nobody has logged that.
  story: number | null;
  complete: number | null;
};

export const configured = () => !!(env.twitchClientId && env.twitchClientSecret);

// ———————————————————————————————————————— Requests

let tokenMemo: { value: string; until: number } | null = null;

async function token(fresh = false): Promise<string> {
  if (!fresh && tokenMemo && tokenMemo.until > Date.now()) return tokenMemo.value;
  if (!fresh) {
    const saved = await read<string>('igdb:token');
    if (saved) return (tokenMemo = { value: saved, until: Date.now() + DAY }).value;
  }
  const q = new URLSearchParams({ client_id: env.twitchClientId, client_secret: env.twitchClientSecret, grant_type: 'client_credentials' });
  const r = await fetch(`https://id.twitch.tv/oauth2/token?${q}`, { method: 'POST', signal: AbortSignal.timeout(5000), cache: 'no-store' });
  if (!r.ok) throw new Error(`twitch token ${r.status}`);
  const j = (await r.json()) as { access_token: string; expires_in: number };
  // Kept until a day before it runs out (they last about two months).
  const ttl = Math.max(60_000, j.expires_in * 1000 - DAY);
  await write('igdb:token', j.access_token, ttl);
  tokenMemo = { value: j.access_token, until: Date.now() + Math.min(ttl, DAY) };
  return j.access_token;
}

// Requests from this server copy start at least GAP_MS apart, to stay under IGDB's 4 a second.
let queue: Promise<unknown> = Promise.resolve();
const slot = () => {
  const turn = queue.then(() => new Promise((r) => setTimeout(r, GAP_MS)));
  queue = turn;
  return queue;
};

export async function igdb<T>(endpoint: string, body: string, retried = false): Promise<T> {
  await slot();
  const r = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: { 'Client-ID': env.twitchClientId, Authorization: `Bearer ${await token(retried)}`, Accept: 'application/json' },
    body,
    signal: AbortSignal.timeout(6000),
    cache: 'no-store',
  });
  if ((r.status === 401 || r.status === 429) && !retried) {
    if (r.status === 429) await new Promise((res) => setTimeout(res, 1000));
    else tokenMemo = null;
    return igdb<T>(endpoint, body, true);
  }
  if (!r.ok) throw new Error(`igdb ${endpoint} ${r.status}`);
  return (await r.json()) as T;
}

// ———————————————————————————————————————— Matching

// Xbox titles carry platform and edition tags ("FIFA 21 Xbox One", "Mafia: Definitive Edition for XBOX One",
// "Grand Theft Auto V (Xbox One)", "EA SPORTS FC 24 Xbox Series X|S"). They're cut so the search finds the game.
const TAGS = [
  /[™®©]/g,
  /\s*[([]\s*(xbox( one| series x\s*\|?\s*s| series x| 360)?|windows( 10)?|pc|game preview)\s*[)\]]\s*$/i,
  /\s+(for\s+)?(xbox( one| series x\s*\|\s*s| series x| 360)?|windows( 10)?)(\s+(edition|version))?\s*$/i,
  /\s+-?\s*(standard|xbox one|windows 10|xbox series x\|s) edition\s*$/i,
  /\s+-\s*$/,
];

export function cleanTitle(title: string): string {
  let t = title;
  for (let i = 0; i < 3; i++) for (const re of TAGS) t = t.replace(re, '');
  return t.replace(/\s+/g, ' ').trim();
}

const ROMAN: Record<string, string> = { ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10' };

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b(ii|iii|iv|vi|vii|viii|ix)\b/g, (r) => ROMAN[r])
    .replace(/&/g, 'and')
    .replace(/^(the|ea sports|tom clancy'?s|sid meier'?s)\s+/g, '')
    .replace(/[^a-z0-9]/g, '');

type Found = { id: number; name: string; platforms?: number[] };

// The search result that is this game: same name once tidied (or one name holding the other, for subtitles and
// sponsor prefixes), preferring one released on Xbox or PC. A loose search hit is a miss rather than a wrong game.
export function pick(title: string, found: Found[]): number | null {
  const want = norm(cleanTitle(title));
  if (!want) return null;
  const onXbox = (f: Found) => (f.platforms ?? []).some((p) => XBOX_PLATFORMS.has(p));
  const exact = found.filter((f) => norm(f.name) === want);
  const close = found.filter((f) => {
    const n = norm(f.name);
    return n.length >= 4 && want.length >= 4 && (n.includes(want) || want.includes(n));
  });
  const best = exact.find(onXbox) ?? exact[0] ?? close.find(onXbox) ?? null;
  return best?.id ?? null;
}

const quote = (s: string) => s.replace(/["\\]/g, ' ').trim();

// ———————————————————————————————————————— Looking up a profile's games

type Saved = TimeToBeat | false;
const key = (g: Game) => `ttb:${g.id}`;
const hrs = (sec: number | null | undefined, max = Infinity) => (sec && sec > 0 && sec / 3600 <= max ? Math.round((sec / 3600) * 2) / 2 : null);

// Fills in `timeToBeat` for a player's unfinished games, most recently played first, and says whether every one has
// an answer. Never throws: anything IGDB can't answer in time keeps the estimate from the player's own pace.
export async function timeToBeat(games: Game[], budgetMs = BUDGET_MS): Promise<boolean> {
  if (!configured()) return true;
  const deadline = Date.now() + budgetMs;
  const open = games
    .filter((g) => g.achievements && g.achievements.maxScore > 0 && g.achievements.score > 0 && g.achievements.progress < 100)
    .sort((a, b) => Math.max(b.lastPlayed ?? 0, b.lastUnlock ?? 0) - Math.max(a.lastPlayed ?? 0, a.lastUnlock ?? 0))
    .slice(0, LOOKUPS);
  const missing: Game[] = [];
  await Promise.all(
    open.map(async (g) => {
      const s = await read<Saved>(key(g));
      if (s === undefined) missing.push(g);
      else g.timeToBeat = s || null;
    }),
  );
  try {
    for (let i = 0; i < missing.length && Date.now() < deadline; i += 10) {
      const chunk = missing.slice(i, i + 10);
      const body = chunk
        .map((g, j) => `query games "q${j}" { fields name,platforms; where name ~ *"${quote(cleanTitle(g.title))}"* & version_parent = null; sort total_rating_count desc; limit 10; };`)
        .join('\n');
      const res = await igdb<{ name: string; result: Found[] }[]>('multiquery', body);
      const ids = new Map<Game, number>();
      // Games whose lookup finished, matched or not; one cut off by the budget isn't remembered as a miss.
      const asked = new Set<Game>();
      for (const r of res) {
        const g = chunk[Number(r.name.slice(1))];
        const id = g && pick(g.title, r.result ?? []);
        if (id) ids.set(g, id);
        if (id) asked.add(g);
      }
      // Sponsor prefixes, punctuation and subtitles ("EA SPORTS FIFA 23" is "FIFA 23" on IGDB) need the text search.
      for (const g of chunk) {
        if (ids.has(g) || Date.now() >= deadline) continue;
        const found = await igdb<Found[]>('games', `search "${quote(cleanTitle(g.title))}"; fields name,platforms; where version_parent = null; limit 10;`);
        const id = pick(g.title, found);
        if (id) ids.set(g, id);
        asked.add(g);
      }
      const times = ids.size
        ? await igdb<{ game_id: number; normally?: number; completely?: number }[]>(
            'game_time_to_beats',
            `fields game_id,normally,completely; where game_id = (${[...new Set(ids.values())].join(',')}); limit 50;`,
          )
        : [];
      const byId = new Map(times.map((t) => [t.game_id, t]));
      await Promise.all(
        [...asked].map(async (g) => {
          const t = ids.has(g) ? byId.get(ids.get(g)!) : undefined;
          const v: TimeToBeat | null = t ? { story: hrs(t.normally, MAX_COMPLETE), complete: hrs(t.completely, MAX_COMPLETE) } : null;
          const useful = v && (v.story || v.complete) ? v : null;
          g.timeToBeat = useful;
          await write(key(g), useful ?? false, useful ? HIT_TTL : MISS_TTL);
        }),
      );
    }
  } catch (e) {
    console.warn('[igdb] time to beat unavailable:', (e as Error).message);
  }
  return open.every((g) => g.timeToBeat !== undefined);
}
