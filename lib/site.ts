export const SITE = {
  name: 'My Gaming Grid',
  contactEmail: 'privacy@morphgrid.io',
  operator: 'Pedro Geciauskas',
  country: 'Sweden',
  lastUpdated: '9 November 2026',
};

// The public address search engines should index; set APP_URL on each deployment.
export const SITE_URL = (process.env.APP_URL ?? 'https://xbox.morphgrid.io').replace(/\/$/, '');

export const placeholder = (v: string) => v.startsWith('[') || v.endsWith('@example.com');

// The share card used when a page has none of its own.
export const SHARE_IMAGE = { url: '/profile/sample/card.png', width: 1200, height: 630, alt: 'A sample My Gaming Grid card for an Xbox profile' };

// Next replaces `openGraph` and `twitter` wholesale instead of merging them with the layout's, so a page that sets only a
// title would still share the home page's og:url, title and description. Every indexable page builds its tags here.
export function pageMeta(path: string, title: string, description: string, image: { url: string; width: number; height: number; alt?: string } = SHARE_IMAGE) {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website' as const, siteName: SITE.name, locale: 'en_US', url: path, title, description, images: [image] },
    twitter: { card: 'summary_large_image' as const, title, description, images: [image.url] },
  };
}

// The sister sites, linked from every footer so search engines (and players) find them all.
export const SISTER_SITES = [
  { key: 'lol', label: 'League of Legends stats', url: 'https://lol.morphgrid.io' },
  { key: 'steam', label: 'Steam profile stats', url: 'https://steam.morphgrid.io' },
  { key: 'chess', label: 'Chess.com & Lichess stats', url: 'https://chess.morphgrid.io' },
  { key: 'psn', label: 'PlayStation trophy stats', url: 'https://psn.morphgrid.io' },
  { key: 'xbox', label: 'Xbox achievement stats', url: 'https://xbox.morphgrid.io' },
];
