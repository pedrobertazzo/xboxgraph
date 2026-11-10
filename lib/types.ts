// Where a title plays, as Xbox lists it in the title history (`devices`).
export type Platform = 'Series X|S' | 'Xbox One' | 'PC' | 'Xbox 360' | 'Mobile';
export const PLATFORMS: Platform[] = ['Series X|S', 'Xbox One', 'PC', 'Xbox 360', 'Mobile'];

export interface Achievements {
  earned: number;
  // Achievements on offer. Xbox 360 games often report 0 here; their gamerscore still counts.
  total: number;
  score: number;
  maxScore: number;
  // Xbox's own completion figure, 0–100: the share of the game's gamerscore unlocked.
  progress: number;
}

export interface Game {
  // The title ID, as a decimal string.
  id: string;
  title: string;
  platforms: Platform[];
  // The square tile, and the box art (portrait) when Xbox has one.
  icon: string | null;
  art: string | null;
  // Minutes played, from Xbox's MinutesPlayed stat: only for Xbox One, Series X|S and PC titles.
  playMin: number | null;
  lastPlayed: number | null;
  // The first and last achievements unlocked, from the unlock list (null when the game's unlocks aren't in it).
  firstUnlock: number | null;
  lastUnlock: number | null;
  genres: string[];
  released: number | null;
  achievements: Achievements | null;
  // From the Xbox store catalogue (lib/catalog.ts), for the games looked up there; null when unknown.
  developer?: string | null;
  publisher?: string | null;
  // Today's US store price (MSRP) in dollars; 0 for free games.
  price?: number | null;
  // The store's average player rating out of 5, and how many rated it.
  rating?: number | null;
  ratings?: number;
  // On Game Pass, as the title history says (OpenXBL); null when not known.
  gamePass?: boolean | null;
}

// One unlocked achievement, from the player's unlock list (Xbox One and later; newest first).
export interface Unlock {
  titleId: string;
  name: string;
  at: number;
  score: number;
  // Share of players who have it, 0–100, when Xbox says.
  rarity: number | null;
  icon: string | null;
}

export interface XboxProfile {
  // The lower-case gamertag, the key used in URLs.
  id: string;
  name: string;
  xuid: string;
  avatar: string | null;
  gamerscore: number;
  // Account tier ("Gold", "Silver") and reputation ("GoodPlayer"…), as Xbox reports them.
  tier: string | null;
  bio: string | null;
  location: string | null;
  // Years on Xbox, from the tenure badge.
  tenure: number | null;
  games: Game[];
  unlocks: Unlock[];
  // True when the unlock list was cut at its cap, so the oldest unlocks are missing.
  unlocksCapped: boolean;
  // True when the player has too many achievements to read their unlock list at all (OpenXBL), so no dates.
  unlocksSkipped?: boolean;
  // True when the unlock list isn't read at all, to save requests (OpenXBL), so there are no dates.
  unlocksOff?: boolean;
  // Whether play time or the unlock list couldn't be read (privacy settings).
  playHidden: boolean;
  unlocksHidden: boolean;
  // When it was read from Xbox, and whether this is an older saved copy shown while Xbox lookups are paused.
  fetchedAt?: number;
  stale?: boolean;
  // With a stale copy: when Xbox lookups should have room again.
  retryAt?: number;
}

export interface Entry {
  label: string;
  value: number;
  display: string;
  image?: string | null;
  poster?: string | null;
  badge?: Badge;
}

// 'complete': a game at 100%; 'rare': a rare achievement; 'unplayed': a game never started.
export type Badge = 'complete' | 'rare' | 'unplayed';
// A card's accent: gamerscore green-gold, completion, or rarity.
export type Theme = 'score' | 'complete' | 'rare' | 'unplayed';

export interface Stat {
  key: string;
  title: string;
  value: number;
  display: string;
  unit: string;
  series: Entry[];
  progress: { value: number; max: number; label: string };
  line: string;
  theme?: Theme;
  tag?: string;
  cover?: Cover;
  gallery?: Entry[];
  heat?: Heat;
  // The Backlog card's figures, drawn as their own card (BacklogCard in views.tsx).
  backlog?: BacklogSummary;
}

export interface BacklogSummary {
  total: number;
  perWeek: number | null;
  games: number;
  untouched: number;
  averaged: number;
  perCompletion: number;
  longest: { label: string; hours: number } | null;
  sizes: { key: string; label: string; hint: string; count: number; hours: number }[];
}

export interface Cover {
  label: string;
  image: string | null;
  poster: string | null;
}

export interface Heat {
  rows: number;
  cols: number;
  values: number[];
  rowLabels?: string[];
  colLabels?: string[];
  tips?: string[];
}

export const profilePath = (p: { id: string }) => `/profile/${encodeURIComponent(p.id)}`;
