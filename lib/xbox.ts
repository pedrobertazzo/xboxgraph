import { env } from './env';
import { cached, pause, pausedUntil, read, spendOne, used, write } from './store';
import type { Achievements, Game, Platform, Unlock, XboxProfile } from './types';

export class XboxError extends Error {
  constructor(public code: 'not_found' | 'private' | 'upstream' | 'bad_input' | 'busy' | 'auth', message: string) {
    super(message);
  }
}

// ———————————————————————————————————————— Input
// Classic gamertags: up to 15 letters, digits and single spaces, starting with a letter. Modern gamertags: up to 12
// characters in many scripts, plus a "#1234" suffix when the name is taken. Both are matched loosely here; Xbox says
// whether the player exists.

const GAMERTAG = /^[\p{L}\p{N}](?:[\p{L}\p{N}]| (?! )){0,15}(?:#\d{1,4})?$/u;
const LINKS: RegExp[] = [
  /^(?:https?:\/\/)?(?:www\.)?xbox\.com\/(?:[a-z]{2}-[a-z]{2}\/)?play\/user\/([^/?#]+)/i,
  /^(?:https?:\/\/)?account\.xbox\.com\/(?:[a-z]{2}-[a-z]{2}\/)?profile\?(?:.*&)?gamertag=([^&#]+)/i,
  /^(?:https?:\/\/)?(?:www\.)?xboxgamertag\.com\/search\/([^/?#]+)/i,
  /^(?:https?:\/\/)?(?:www\.)?trueachievements\.com\/gamer\/([^/?#]+)/i,
  /^(?:https?:\/\/)?(?:www\.)?xboxachievements\.com\/profile\/([^/?#]+)/i,
];

const decode = (s: string) => {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  } catch {
    return s;
  }
};
const tidy = (s: string) => s.trim().replace(/\s+/g, ' ');

export const validGamertag = (s: string) => GAMERTAG.test(tidy(s));

// Search input to a lower-case gamertag, or null when it isn't one.
export function parseGamertag(raw: string): string | null {
  const s = raw.trim();
  for (const re of LINKS) {
    const m = s.match(re);
    if (m) {
      const gt = tidy(decode(m[1]));
      return GAMERTAG.test(gt) ? gt.toLowerCase() : null;
    }
  }
  const gt = tidy(s);
  return GAMERTAG.test(gt) ? gt.toLowerCase() : null;
}

export function inputProblem(raw: string): string {
  const s = tidy(raw);
  if (!s) return 'Type a gamertag or paste a profile link.';
  if (/^https?:\/\//i.test(s) || /\.\w{2,}\//.test(s)) return 'That link isn’t an Xbox profile. Profile links look like xbox.com/play/user/Gamertag.';
  if (s.replace(/#\d+$/, '').length > 16) return 'Gamertags are at most 15 characters, plus a #1234 suffix for some.';
  if (/#/.test(s) && !/#\d{1,4}$/.test(s)) return 'A gamertag’s suffix is # and up to four digits, like Gamertag#1234.';
  return 'That isn’t a valid gamertag: use letters, digits and single spaces, starting with a letter or digit.';
}

// ———————————————————————————————————————— Where Xbox data comes from
// OpenXBL (xbl.io) when OPENXBL_API_KEY is set: one key, no sign-in to set up. Otherwise the site signs in to Xbox Live
// itself as a helper Microsoft account (Azure app + refresh token, see the README).

export type Source = 'openxbl' | 'direct';
export const source = (): Source => (env.openxblKey ? 'openxbl' : 'direct');

// ———————————————————————————————————————— Request budget
// OpenXBL allows 150 requests an hour on its free plan (per key); a new profile costs 4. Signed in directly, Xbox Live
// limits each user per service and the site keeps to 300 requests per 15 minutes; a new profile costs 4 to 6. All
// server copies share one count (in Redis, when connected), and after a 429 every request waits it out (at least a
// minute). Either budget can be changed with OPENXBL_BUDGET or XBOX_BUDGET.

const LIMITS: Record<Source, { window: number; budget: number }> = {
  openxbl: { window: 60 * 60_000, budget: Number(process.env.OPENXBL_BUDGET) || 145 },
  direct: { window: 15 * 60_000, budget: Number(process.env.XBOX_BUDGET) || 300 },
};

async function remaining() {
  const l = LIMITS[source()];
  return l.budget - (await used(l.window));
}

export const budgetState = async () => ({ source: source(), budget: LIMITS[source()].budget, remaining: await remaining(), blocked: Date.now() < (await pausedUntil()) });

class HttpError extends Error {
  constructor(public status: number, public retryAfter: number | null) {
    super(`HTTP ${status}`);
  }
}

async function spend<T>(call: () => Promise<T>): Promise<T> {
  if (Date.now() < (await pausedUntil()) || (await remaining()) <= 0)
    throw new XboxError('busy', 'My Gaming Grid has used its Xbox requests for now. Try again in a few minutes; profiles viewed recently still work.');
  await spendOne(LIMITS[source()].window);
  try {
    return await call();
  } catch (e) {
    if (e instanceof HttpError && e.status === 429) {
      await pause(Math.max(60_000, (e.retryAfter ?? 60) * 1000));
      throw new XboxError('busy', 'Xbox asked us to slow down. Try again in a minute or two.');
    }
    throw e;
  }
}

// ———————————————————————————————————————— OpenXBL
// Every answer comes wrapped as { content, code }. X-RateLimit-Remaining says how much of the key's hour is left; at 0
// the site pauses new reads for ten minutes rather than collecting 429s.

async function oxbl<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  return spend(async () => {
    const r = await fetch(`https://api.xbl.io${path}`, {
      method: init.method ?? 'GET',
      signal: AbortSignal.timeout(45_000),
      headers: { 'X-Authorization': env.openxblKey, Accept: 'application/json', 'Accept-Language': 'en-US', ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    });
    if (r.headers.get('x-ratelimit-remaining') === '0') await pause(10 * 60_000);
    if (r.status === 401) throw new XboxError('auth', 'This site’s OpenXBL key was refused. The site owner needs to check OPENXBL_API_KEY.');
    if (!r.ok) throw new HttpError(r.status, Number(r.headers.get('retry-after')) || null);
    const j = (await r.json()) as { content?: T } & T;
    return (j && typeof j === 'object' && 'content' in j ? j.content : j) as T;
  });
}

// ———————————————————————————————————————— Sign-in
// The site reads Xbox Live as one helper Microsoft account. Its refresh token (XBOX_REFRESH_TOKEN, from
// `npm run xbox-login`) is swapped for a Microsoft access token, then a Xbox Live user token, then an XSTS token, which
// lasts about 16 hours. Microsoft hands out a new refresh token on every refresh; the newest is kept in the shared store
// so it outlives the one in the environment.

const SCOPE = 'Xboxlive.signin Xboxlive.offline_access';
type Xsts = { uhs: string; token: string; until: number; xuid: string };
let memoXsts: Xsts | null = null;

async function postJson<T>(url: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers }, body: JSON.stringify(body), cache: 'no-store' });
  if (!r.ok) throw new HttpError(r.status, Number(r.headers.get('retry-after')) || null);
  return r.json() as Promise<T>;
}

// A Microsoft account token from a refresh token or an authorization code. Exported for the login script.
export async function msaToken(grant: { refresh_token: string } | { code: string }) {
  if (!env.clientId) throw new XboxError('auth', 'This site isn’t connected to Xbox yet (XBOX_CLIENT_ID is not set).');
  const body = new URLSearchParams({
    client_id: env.clientId,
    scope: SCOPE,
    redirect_uri: env.redirectUri,
    ...('code' in grant ? { grant_type: 'authorization_code', code: grant.code } : { grant_type: 'refresh_token', refresh_token: grant.refresh_token }),
    ...(env.clientSecret ? { client_secret: env.clientSecret } : {}),
  });
  const r = await fetch('https://login.live.com/oauth20_token.srf', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, cache: 'no-store' });
  const j = (await r.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; error?: string; error_description?: string };
  if (!r.ok || !j.access_token) throw new XboxError('auth', `Microsoft sign-in failed: ${j.error_description ?? j.error ?? r.status}`);
  return { access: j.access_token, refresh: j.refresh_token ?? null };
}

// A Microsoft access token to an XSTS token for Xbox Live. Exported for the login script.
export async function xstsFor(msaAccess: string): Promise<Xsts> {
  const user = await postJson<{ Token: string }>(
    'https://user.auth.xboxlive.com/user/authenticate',
    { RelyingParty: 'http://auth.xboxlive.com', TokenType: 'JWT', Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: `d=${msaAccess}` } },
    { 'x-xbl-contract-version': '1' },
  );
  const x = await postJson<{ Token: string; NotAfter: string; DisplayClaims: { xui: { uhs: string; xid?: string }[] } }>(
    'https://xsts.auth.xboxlive.com/xsts/authorize',
    { RelyingParty: 'http://xboxlive.com', TokenType: 'JWT', Properties: { UserTokens: [user.Token], SandboxId: 'RETAIL' } },
    { 'x-xbl-contract-version': '1' },
  );
  const claim = x.DisplayClaims.xui[0];
  return { uhs: claim.uhs, token: x.Token, xuid: claim.xid ?? '', until: Date.parse(x.NotAfter) || Date.now() + 8 * 3600_000 };
}

const REFRESH_KEY = 'auth:refresh';
const XSTS_KEY = 'auth:xsts';
let signingIn: Promise<Xsts> | null = null;

async function signIn(): Promise<Xsts> {
  const refresh = (await read<string>(REFRESH_KEY)) ?? env.refreshToken;
  if (!refresh) throw new XboxError('auth', 'This site isn’t connected to Xbox yet (XBOX_REFRESH_TOKEN is not set).');
  let msa;
  try {
    msa = await msaToken({ refresh_token: refresh });
  } catch (e) {
    // A stored token can go stale while the environment's is newer (after the owner signs in again): try that once.
    if (refresh !== env.refreshToken && env.refreshToken) msa = await msaToken({ refresh_token: env.refreshToken });
    else throw e;
  }
  if (msa.refresh) await write(REFRESH_KEY, msa.refresh, 85 * 86400_000);
  const x = await xstsFor(msa.access);
  await write(XSTS_KEY, x, Math.max(60_000, x.until - Date.now() - 10 * 60_000));
  return x;
}

async function authorization(): Promise<string> {
  const now = Date.now();
  if (!memoXsts || now > memoXsts.until - 10 * 60_000) {
    const stored = await read<Xsts>(XSTS_KEY);
    if (stored && now < stored.until - 10 * 60_000) memoXsts = stored;
    else {
      signingIn ??= signIn().finally(() => (signingIn = null));
      try {
        memoXsts = await signingIn;
      } catch (e) {
        memoXsts = null;
        if (e instanceof XboxError) throw e;
        throw new XboxError('auth', 'This site’s Xbox sign-in has expired. The site owner needs to run `npm run xbox-login` and set a fresh XBOX_REFRESH_TOKEN.');
      }
    }
  }
  return `XBL3.0 x=${memoXsts!.uhs};${memoXsts!.token}`;
}

async function xbl<T>(url: string, contract: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  return spend(async () => {
    const send = async () =>
      fetch(url, {
        method: init.method ?? 'GET',
        headers: {
          Authorization: await authorization(),
          'x-xbl-contract-version': contract,
          'Accept-Language': 'en-US',
          Accept: 'application/json',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: init.body ? JSON.stringify(init.body) : undefined,
        cache: 'no-store',
      });
    let r = await send();
    // A token Xbox no longer accepts: sign in afresh once.
    if (r.status === 401) {
      memoXsts = null;
      await write(XSTS_KEY, null, 1);
      r = await send();
    }
    if (!r.ok) throw new HttpError(r.status, Number(r.headers.get('retry-after')) || null);
    return r.json() as Promise<T>;
  });
}

// ———————————————————————————————————————— Reading a profile

// Some Xbox image addresses are http://, which browsers block on an https page; tiles get a sensible size.
export function secure(u: string | null | undefined, size?: number): string | null {
  if (!u) return null;
  const s = u.replace(/^http:\/\//i, 'https://');
  if (size && /images-eds(-ssl)?\.xboxlive\.com\/image/i.test(s) && !/[?&]w=/.test(s)) return `${s}${s.includes('?') ? '&' : '?'}w=${size}&h=${size}`;
  if (size && /store-images\.s-microsoft\.com/i.test(s) && !/[?&]w=/.test(s)) return `${s}${s.includes('?') ? '&' : '?'}w=${size}`;
  return s;
}

const DEVICE: Record<string, Platform> = {
  XboxSeries: 'Series X|S',
  Scarlett: 'Series X|S',
  XboxOne: 'Xbox One',
  Durango: 'Xbox One',
  PC: 'PC',
  Win32: 'PC',
  Xbox360: 'Xbox 360',
  iOS: 'Mobile',
  Android: 'Mobile',
};

export const platformsOf = (devices: string[] | undefined): Platform[] => [...new Set((devices ?? []).map((d) => DEVICE[d]).filter((p): p is Platform => !!p))];

const time = (s: string | null | undefined) => (s ? Date.parse(s) || null : null);

export type TitleLike = {
  titleId: string;
  name: string;
  type?: string;
  devices?: string[];
  displayImage?: string;
  mediaItemType?: string;
  achievement?: { currentAchievements?: number; totalAchievements?: number; currentGamerscore?: number; totalGamerscore?: number; progressPercentage?: number };
  titleHistory?: { lastTimePlayed?: string };
  images?: { url: string; type: string }[];
  detail?: { genres?: string[]; releaseDate?: string };
};

// The title history also holds apps (Netflix, Spotify, the Xbox app…), typed "App"; only games are kept. Don't go by
// mediaItemType: Xbox files nearly every modern game as "Application" there.
export function isGame(t: TitleLike): boolean {
  return !t.type || t.type === 'Game';
}

export function toGame(t: TitleLike): Game {
  const a = t.achievement;
  const maxScore = a?.totalGamerscore ?? 0;
  const score = a?.currentGamerscore ?? 0;
  const achievements: Achievements | null =
    a && (maxScore > 0 || (a.totalAchievements ?? 0) > 0 || (a.currentAchievements ?? 0) > 0)
      ? {
          earned: a.currentAchievements ?? 0,
          total: Math.max(a.totalAchievements ?? 0, a.currentAchievements ?? 0),
          score,
          maxScore,
          progress: Math.round(a.progressPercentage || (maxScore ? (score / maxScore) * 100 : 0)),
        }
      : null;
  const img = (type: string) => t.images?.find((i) => i.type === type)?.url;
  return {
    id: String(t.titleId),
    title: t.name.replace(/[®™©]/g, '').trim(),
    platforms: platformsOf(t.devices),
    icon: secure(img('Tile') ?? t.displayImage, 300),
    art: secure(img('BoxArt') ?? img('Poster') ?? img('BrandedKeyArt'), 400),
    playMin: null,
    lastPlayed: time(t.titleHistory?.lastTimePlayed),
    firstUnlock: null,
    lastUnlock: null,
    genres: (t.detail?.genres ?? []).filter((g) => g && !/^(?:Other|Classics)$/i.test(g)),
    released: time(t.detail?.releaseDate),
    achievements,
  };
}

type UnlockLike = {
  name: string;
  titleAssociations?: { id: number | string }[];
  progression?: { timeUnlocked?: string };
  rarity?: { currentPercentage?: number };
  rewards?: { type: string; value: string }[];
  mediaAssets?: { type: string; url: string }[];
};

export function toUnlock(u: UnlockLike): Unlock | null {
  const at = time(u.progression?.timeUnlocked);
  // Locked achievements carry the date 0001-01-01.
  if (at != null && at < Date.UTC(2005, 0, 1)) return null;
  const titleId = u.titleAssociations?.[0]?.id;
  if (!at || titleId == null) return null;
  const score = Number(u.rewards?.find((r) => r.type === 'Gamerscore')?.value ?? 0) || 0;
  return {
    titleId: String(titleId),
    name: u.name,
    at,
    score,
    rarity: typeof u.rarity?.currentPercentage === 'number' ? u.rarity.currentPercentage : null,
    icon: secure(u.mediaAssets?.find((m) => m.type === 'Icon')?.url, 128),
  };
}

// Each game's first and last unlock, from the unlock list.
export function attachUnlocks(games: Game[], unlocks: Unlock[]) {
  const by = new Map(games.map((g) => [g.id, g]));
  for (const u of unlocks) {
    const g = by.get(u.titleId);
    if (!g) continue;
    g.firstUnlock = Math.min(g.firstUnlock ?? Infinity, u.at);
    g.lastUnlock = Math.max(g.lastUnlock ?? 0, u.at);
  }
}

const SETTINGS = ['Gamertag', 'ModernGamertag', 'ModernGamertagSuffix', 'UniqueModernGamertag', 'GameDisplayPicRaw', 'Gamerscore', 'AccountTier', 'XboxOneRep', 'Bio', 'Location', 'TenureLevel'];
const PAGES = 2;
// MinutesPlayed for this many games per request: OpenXBL takes them all at once; Xbox Live, 200.
const PLAY_BATCH: Record<Source, number> = { openxbl: 600, direct: 200 };
const PLAY_MAX = 600;
// OpenXBL's achievement list holds every achievement of every game played, unlocked or not, ordered by game rather
// than by date, so it's read whole or not at all. About 1 MB and under a second per 1,000; past this many it gets too
// slow for a page (25,000 took 30 seconds), and those players go without unlock dates.
const OXBL_ACHIEVEMENTS = 12_000;

type ProfileUser = { id: string; settings: { id: string; value: string }[] };
type Stats = { statlistscollection?: { stats?: { name: string; titleid: string; value?: string }[] }[] };
type UnlockPage = { achievements?: (UnlockLike & { progressState?: string })[]; pagingInfo?: { continuationToken?: string | null } };

// The four reads behind a profile, from OpenXBL or straight from Xbox Live. Both give Xbox Live's own shapes.
const READS = {
  openxbl: {
    user: async (gt: string) => (await oxbl<{ profileUsers?: ProfileUser[] }>(`/v2/friends/search?gt=${encodeURIComponent(gt)}`)).profileUsers?.[0],
    titles: async (xuid: string) => (await oxbl<{ titles?: TitleLike[] }>(`/v2/titles/${xuid}`)).titles ?? [],
    stats: (xuid: string, ids: string[]) => oxbl<Stats>('/v2/player/stats', { method: 'POST', body: { xuids: [xuid], groups: [], stats: ids.map((titleId) => ({ name: 'MinutesPlayed', titleId })) } }),
    // One request: every achievement with its unlock time, but no rarity (that needs a request per game).
    unlocks: async (xuid: string, offered: number) => {
      if (offered > OXBL_ACHIEVEMENTS) return { list: [], capped: true, skipped: true };
      const r = await oxbl<UnlockPage>(`/v3/achievements/player/${xuid}?maxItems=${OXBL_ACHIEVEMENTS}`);
      return { list: (r.achievements ?? []).filter((a) => a.progressState === 'Achieved'), capped: !!r.pagingInfo?.continuationToken, skipped: false };
    },
  },
  direct: {
    user: async (gt: string) =>
      (await xbl<{ profileUsers: ProfileUser[] }>(`https://profile.xboxlive.com/users/gt(${encodeURIComponent(gt)})/profile/settings?settings=${SETTINGS.join(',')}`, '3')).profileUsers[0],
    titles: async (xuid: string) =>
      (await xbl<{ titles: TitleLike[] }>(`https://titlehub.xboxlive.com/users/xuid(${xuid})/titles/titlehistory/decoration/achievement,image,detail?maxItems=5000`, '2')).titles ?? [],
    stats: (xuid: string, ids: string[]) =>
      xbl<Stats>('https://userstats.xboxlive.com/batch', '2', { method: 'POST', body: { arrangebyfield: 'xuid', xuids: [xuid], groups: [], stats: ids.map((titleId) => ({ name: 'MinutesPlayed', titleId })) } }),
    // Unlocked only, newest first, with rarity: up to 2,000, which covers time of day and the calendar for nearly
    // everyone; heavy hunters' oldest unlocks are left out.
    unlocks: async (xuid: string, _offered: number) => {
      const list: UnlockLike[] = [];
      let token: string | null = null;
      for (let page = 0; page < PAGES; page++) {
        const q = new URLSearchParams({ unlockedOnly: 'true', maxItems: '1000', orderBy: 'UnlockTime' });
        if (token) q.set('continuationToken', token);
        const r: UnlockPage = await xbl<UnlockPage>(`https://achievements.xboxlive.com/users/xuid(${xuid})/achievements?${q}`, '2');
        list.push(...(r.achievements ?? []));
        token = r.pagingInfo?.continuationToken ?? null;
        if (!token) return { list, capped: false, skipped: false };
      }
      return { list, capped: true, skipped: false };
    },
  },
};

async function readProfile(gamertag: string): Promise<XboxProfile> {
  const read = READS[source()];
  // The profile: gamertag → xuid, picture and gamerscore.
  let user: ProfileUser | undefined;
  try {
    user = await read.user(gamertag);
  } catch (e) {
    if (e instanceof XboxError) throw e;
    if (e instanceof HttpError && e.status >= 500) throw new XboxError('upstream', 'Xbox didn’t answer. Try again in a moment.');
  }
  if (!user) throw new XboxError('not_found', 'No Xbox player has that gamertag.');
  const set = (k: string) => user!.settings.find((s) => s.id === k)?.value || null;
  const xuid = user.id;

  // Every title the player has played, with its achievement summary (and, signed in directly, art, genres and dates).
  let titles: TitleLike[];
  try {
    titles = await read.titles(xuid);
  } catch (e) {
    if (e instanceof XboxError) throw e;
    if (e instanceof HttpError && (e.status === 403 || e.status === 401)) throw new XboxError('private', 'This player’s game history is private.');
    throw new XboxError('upstream', 'Xbox didn’t return this player’s games. Try again in a moment.');
  }
  const games = titles.filter(isGame).map(toGame);

  // Play time, for Xbox One, Series X|S and PC games, most recently played first; and the unlocked achievements.
  // The two don't depend on each other, so they're read at the same time.
  let playHidden = false;
  const timed = games
    .filter((g) => g.platforms.some((p) => p !== 'Xbox 360' && p !== 'Mobile'))
    .sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0))
    .slice(0, PLAY_MAX);
  const byId = new Map(games.map((g) => [g.id, g]));
  const batch = PLAY_BATCH[source()];
  const playing = (async () => {
    for (let i = 0; i < timed.length; i += batch) {
      const r = await read.stats(xuid, timed.slice(i, i + batch).map((g) => g.id));
      for (const s of r.statlistscollection?.[0]?.stats ?? []) {
        const g = byId.get(String(s.titleid));
        const min = Number(s.value);
        if (g && s.name === 'MinutesPlayed' && min > 0) g.playMin = min;
      }
    }
  })();
  let unlocks: Unlock[] = [];
  let unlocksHidden = false;
  let unlocksCapped = false;
  let unlocksSkipped = false;
  // Achievements on offer across every game played, from the title history: how big the full list would be.
  const offered = titles.reduce((s, t) => s + (t.achievement?.totalAchievements ?? 0), 0);
  const unlocking = (async () => {
    const r = await read.unlocks(xuid, offered);
    unlocks = r.list.map(toUnlock).filter((u): u is Unlock => !!u);
    unlocksCapped = r.capped;
    unlocksSkipped = r.skipped;
  })();
  const [played, unlocked] = await Promise.allSettled([playing, unlocking]);
  for (const r of [played, unlocked]) if (r.status === 'rejected' && r.reason instanceof XboxError && r.reason.code === 'busy') throw r.reason;
  playHidden = played.status === 'rejected';
  unlocksHidden = unlocked.status === 'rejected';
  unlocks.sort((a, b) => b.at - a.at);
  attachUnlocks(games, unlocks);
  // Icons are only shown for the rarest; dropping the rest keeps a big profile small enough for the shared cache.
  const rarest = new Set([...unlocks].filter((u) => u.rarity != null).sort((a, b) => a.rarity! - b.rarity!).slice(0, 40));
  for (const u of unlocks) if (!rarest.has(u)) u.icon = null;

  const tag = set('UniqueModernGamertag') ?? set('Gamertag') ?? gamertag;
  return {
    id: gamertag.toLowerCase(),
    name: tag.replace(/#0+$/, ''),
    xuid,
    avatar: secure(set('GameDisplayPicRaw'), 208),
    gamerscore: Number(set('Gamerscore')) || games.reduce((s, g) => s + (g.achievements?.score ?? 0), 0),
    tier: set('AccountTier'),
    bio: set('Bio'),
    location: set('Location'),
    tenure: Number(set('TenureLevel')) || null,
    games,
    unlocks,
    unlocksCapped,
    unlocksSkipped,
    playHidden,
    unlocksHidden,
  };
}

// Loads already running are shared, so two visitors opening the same new profile cost one read.
const inflight = new Map<string, Promise<XboxProfile>>();

export async function getXboxProfile(gamertag: string): Promise<XboxProfile> {
  const gt = tidy(gamertag);
  if (!validGamertag(gt)) throw new XboxError('bad_input', inputProblem(gt));
  const key = gt.toLowerCase();
  let p = inflight.get(key);
  if (!p) {
    p = cached(`profile:${key}`, 60 * 60_000, () => readProfile(gt)).finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}
