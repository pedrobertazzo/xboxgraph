import { cached } from './store';
import type { Game } from './types';

// The Xbox store catalogue: genres, release date, developer, publisher, today's price, the store's player rating and
// box art for a game, looked up by its Xbox title ID. It's public and needs no key, so it doesn't touch the Xbox request
// budget; each game is cached for 30 days and shared by every profile that has it, so popular games are looked up once.

const DAY = 86400000;
const LOOKUPS = 80;
const AT_ONCE = 8;

export type StoreInfo = {
  developer: string | null;
  publisher: string | null;
  genres: string[];
  released: number | null;
  price: number | null;
  rating: number | null;
  ratings: number;
  poster: string | null;
  box: string | null;
};

type Product = {
  LocalizedProperties?: { DeveloperName?: string; PublisherName?: string; Images?: { ImagePurpose: string; Uri: string }[] }[];
  Properties?: { Category?: string; Categories?: string[] | null };
  MarketProperties?: { OriginalReleaseDate?: string; UsageData?: { AggregateTimeSpan: string; AverageRating: number; RatingCount: number }[] }[];
  DisplaySkuAvailabilities?: { Availabilities?: { OrderManagementData?: { Price?: { MSRP?: number } } }[] }[];
};

export function parseProduct(p: Product): StoreInfo {
  const lp = p.LocalizedProperties?.[0];
  const mp = p.MarketProperties?.[0];
  const img = (purpose: string, w: number) => {
    const u = lp?.Images?.find((i) => i.ImagePurpose === purpose)?.Uri;
    return u ? `${u.startsWith('//') ? 'https:' : ''}${u}?w=${w}` : null;
  };
  // Unreleased or undated products carry 9998-12-30.
  const released = mp?.OriginalReleaseDate ? Date.parse(mp.OriginalReleaseDate) : NaN;
  const all = mp?.UsageData?.find((u) => u.AggregateTimeSpan === 'AllTime');
  let price: number | null = null;
  for (const sku of p.DisplaySkuAvailabilities ?? []) {
    const msrp = sku.Availabilities?.find((a) => a.OrderManagementData?.Price?.MSRP != null)?.OrderManagementData?.Price?.MSRP;
    if (msrp != null) {
      price = msrp;
      break;
    }
  }
  const genres = [...new Set([p.Properties?.Category, ...(p.Properties?.Categories ?? [])].filter((g): g is string => !!g && !/^(Other|Classics)$/i.test(g)))];
  return {
    developer: lp?.DeveloperName?.trim() || null,
    publisher: lp?.PublisherName?.trim() || null,
    genres,
    released: Number.isFinite(released) && new Date(released).getUTCFullYear() < 2100 ? released : null,
    price,
    rating: all && all.RatingCount > 0 ? all.AverageRating : null,
    ratings: all?.RatingCount ?? 0,
    poster: img('Poster', 400),
    box: img('BoxArt', 300),
  };
}

async function lookup(titleId: string): Promise<StoreInfo | false> {
  const r = await fetch(`https://displaycatalog.mp.microsoft.com/v7.0/products/lookup?alternateId=XboxTitleId&value=${titleId}&market=US&languages=en-US&fieldsTemplate=details`, {
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`store ${r.status}`);
  const p = ((await r.json()) as { Products?: Product[] }).Products?.[0];
  // Old games with no store page are remembered as "nothing", so they aren't asked about again.
  return p ? parseProduct(p) : false;
}

export const storeInfo = (titleId: string) => cached<StoreInfo | false>(`store:${titleId}`, 30 * DAY, () => lookup(titleId)).catch(() => false as const);

// Fills in store details for a player's most played and most recent games, a few lookups at a time. Anything the
// title history already gave (direct sign-in has genres, dates and art) is kept.
export async function enrich(games: Game[], limit = LOOKUPS) {
  const pick = games
    .filter((g) => (g.playMin ?? 0) > 0 || (g.achievements?.score ?? 0) > 0)
    .sort((a, b) => (b.playMin ?? 0) - (a.playMin ?? 0) || (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0))
    .slice(0, limit);
  let next = 0;
  const worker = async () => {
    while (next < pick.length) {
      const g = pick[next++];
      const s = await storeInfo(g.id);
      if (!s) continue;
      g.developer = s.developer;
      g.publisher = s.publisher;
      g.price = s.price;
      g.rating = s.rating;
      g.ratings = s.ratings;
      if (!g.genres.length) g.genres = s.genres;
      g.released ??= s.released;
      g.art ??= s.poster;
      if (s.box) g.icon = s.box;
    }
  };
  await Promise.all(Array.from({ length: AT_ONCE }, worker));
  return pick.length;
}
