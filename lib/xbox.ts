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

// ———————————————————————————————————————— Request budget
// Xbox Live limits each signed-in user per service (titles, achievements, stats, profiles) and answers 429 with a
// Retry-After when a burst is too fast. All server copies share one count (in Redis, when connected) and stay under a
// conservative overall budget; after a 429 every request waits out the Retry-After (at least a minute). A new profile
// costs 4 to 9 requests: the profile, the title history, play time (200 games a request) and the unlock list (1,000
// achievements a page, up to 5 pages).

const WINDOW = 15 * 60_000;
export const BUDGET = Number(process.env.XBOX_BUDGET) || 300;

async function remaining() {
  return BUDGET - (await used(WINDOW));
}

export const budgetState = async () => ({ remaining: await remaining(), blocked: Date.now() < (await pausedUntil()) });

class HttpError extends Error {
  constructor(public status: number, public retryAfter: number | null) {
    super(`HTTP ${status}`);
  }
}

async function spend<T>(call: () => Promise<T>): Promise<T> {
  if (Date.now() < (await pausedUntil()) || (await remaining()) <= 0)
    throw new XboxError('busy', 'My Gaming Grid has used its Xbox requests for now. Try again in a few minutes; profiles viewed recently still work.');
  await spendOne(WINDOW);
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

// The title history also holds apps (Netflix, Spotify, the Xbox app…); only games are kept.
export function isGame(t: TitleLike): boolean {
  if (t.type && t.type !== 'Game') return false;
  return !/^(?:Application|App|Video|Music)$/i.test(t.mediaItemType ?? '');
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
const PAGES = 5;
const PLAY_BATCH = 200;
const PLAY_MAX = 600;

async function readProfile(gamertag: string): Promise<XboxProfile> {
  // The profile: gamertag → xuid, picture and gamerscore.
  let user: { id: string; settings: { id: string; value: string }[] };
  try {
    const r = await xbl<{ profileUsers: typeof user[] }>(`https://profile.xboxlive.com/users/gt(${encodeURIComponent(gamertag)})/profile/settings?settings=${SETTINGS.join(',')}`, '3');
    user = r.profileUsers[0];
  } catch (e) {
    if (e instanceof XboxError) throw e;
    throw new XboxError('not_found', 'No Xbox player has that gamertag.');
  }
  const set = (k: string) => user.settings.find((s) => s.id === k)?.value || null;
  const xuid = user.id;

  // Every title the player has played, with its achievement summary, art, genres and release date.
  let titles: TitleLike[];
  try {
    titles = (await xbl<{ titles: TitleLike[] }>(`https://titlehub.xboxlive.com/users/xuid(${xuid})/titles/titlehistory/decoration/achievement,image,detail?maxItems=5000`, '2')).titles ?? [];
  } catch (e) {
    if (e instanceof XboxError) throw e;
    if (e instanceof HttpError && (e.status === 403 || e.status === 401)) throw new XboxError('private', 'This player’s game history is private.');
    throw new XboxError('upstream', 'Xbox didn’t return this player’s games. Try again in a moment.');
  }
  const games = titles.filter(isGame).map(toGame);

  // Play time, for Xbox One, Series X|S and PC games, most recently played first.
  let playHidden = false;
  const timed = games
    .filter((g) => g.platforms.some((p) => p !== 'Xbox 360' && p !== 'Mobile'))
    .sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0))
    .slice(0, PLAY_MAX);
  const byId = new Map(games.map((g) => [g.id, g]));
  try {
    for (let i = 0; i < timed.length; i += PLAY_BATCH) {
      const batch = timed.slice(i, i + PLAY_BATCH);
      const r = await xbl<{ statlistscollection?: { stats?: { name: string; titleid: string; value?: string }[] }[] }>('https://userstats.xboxlive.com/batch', '2', {
        method: 'POST',
        body: { arrangebyfield: 'xuid', xuids: [xuid], groups: [], stats: batch.map((g) => ({ name: 'MinutesPlayed', titleId: g.id })) },
      });
      for (const s of r.statlistscollection?.[0]?.stats ?? []) {
        const g = byId.get(String(s.titleid));
        const min = Number(s.value);
        if (g && s.name === 'MinutesPlayed' && min > 0) g.playMin = min;
      }
    }
  } catch (e) {
    if (e instanceof XboxError && e.code === 'busy') throw e;
    playHidden = true;
  }

  // Unlocked achievements, newest first, with their rarity: up to 5,000.
  const unlocks: Unlock[] = [];
  let unlocksHidden = false;
  let unlocksCapped = false;
  try {
    let token: string | null = null;
    for (let page = 0; page < PAGES; page++) {
      const q = new URLSearchParams({ unlockedOnly: 'true', maxItems: '1000', orderBy: 'UnlockTime' });
      if (token) q.set('continuationToken', token);
      const r = await xbl<{ achievements: UnlockLike[]; pagingInfo?: { continuationToken?: string | null } }>(`https://achievements.xboxlive.com/users/xuid(${xuid})/achievements?${q}`, '2');
      for (const a of r.achievements ?? []) {
        const u = toUnlock(a);
        if (u) unlocks.push(u);
      }
      token = r.pagingInfo?.continuationToken ?? null;
      if (!token) break;
      if (page === PAGES - 1) unlocksCapped = true;
    }
  } catch (e) {
    if (e instanceof XboxError && e.code === 'busy') throw e;
    unlocksHidden = !unlocks.length;
  }
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
