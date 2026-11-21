import { cached } from './store';

// The same name on the sister sites: a public Steam profile with that custom URL, or a Chess.com or Lichess account,
// each checked through the site's public pages, so no keys and no Xbox requests. It's only a name match, so the page
// says "a Steam profile called X", never "your Steam". Answers are cached a week per name.

const DAY = 86400000;
const TTL = 7 * DAY;
// Names Steam custom URLs and both chess sites accept; gamertags with spaces or a #suffix can't be on them.
const NAME = /^[A-Za-z0-9_-]{3,25}$/;
const UTM = 'utm_source=xbox.morphgrid.io&utm_medium=referral&utm_campaign=also-on';
const UA = 'MyGamingGrid/1.0 (+https://xbox.morphgrid.io)';

export type Site = 'steam' | 'chesscom' | 'lichess';
export type Match = { site: Site; label: string; url: string };

export const LABELS: Record<Site, string> = { steam: 'Steam', chesscom: 'Chess.com', lichess: 'Lichess' };

export const validName = (name: string) => NAME.test(name);

const get = (url: string) => fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000), cache: 'no-store' });

// The Steam ID, linked to directly: the grid's /id/ page redirects there and would drop the referral tag.
async function steam(name: string) {
  const r = await get(`https://steamcommunity.com/id/${name}/?xml=1`);
  if (!r.ok) return false;
  const x = await r.text();
  const id = x.match(/<steamID64>(\d{17})<\/steamID64>/)?.[1];
  // Only public profiles, since the Steam grid can't show a private one.
  return id && /<privacyState>public<\/privacyState>/.test(x) ? id : false;
}

async function chesscom(name: string) {
  const r = await get(`https://api.chess.com/pub/player/${name.toLowerCase()}`);
  if (!r.ok) return false;
  const j = (await r.json()) as { status?: string };
  return !String(j.status ?? '').startsWith('closed');
}

async function lichess(name: string) {
  const r = await get(`https://lichess.org/api/user/${name}`);
  if (!r.ok) return false;
  const j = (await r.json()) as { id?: string; disabled?: boolean; closed?: boolean; tosViolation?: boolean };
  return !!j.id && !j.disabled && !j.closed && !j.tosViolation;
}

export const urlFor = (site: Site, name: string, steamId?: string) =>
  site === 'steam'
    ? `https://steam.morphgrid.io/${steamId ? `profiles/${steamId}` : `id/${encodeURIComponent(name)}`}?${UTM}`
    : `https://chess.morphgrid.io/${site === 'lichess' ? '@' : 'member'}/${encodeURIComponent(name)}?${UTM}`;

// A failed check is "not there" rather than an error: this is an extra, never worth a broken page.
const CHECKS: [Site, (name: string) => Promise<string | boolean>][] = [
  ['steam', steam],
  ['chesscom', chesscom],
  ['lichess', lichess],
];

export async function elsewhere(name: string): Promise<Match[]> {
  if (!validName(name)) return [];
  type Hit = { site: Site; id?: string };
  const found = await cached<Hit[]>(`elsewhere:${name.toLowerCase()}`, TTL, async () => {
    const hits = await Promise.all(
      CHECKS.map(([site, check]) => check(name).then((ok): Hit | null => (ok ? { site, ...(typeof ok === 'string' ? { id: ok } : {}) } : null), () => null)),
    );
    return hits.filter((h): h is Hit => h !== null);
  });
  return found.map((h) => ({ site: h.site, label: LABELS[h.site], url: urlFor(h.site, name, h.id) }));
}
