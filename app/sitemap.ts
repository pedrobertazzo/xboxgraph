import type { MetadataRoute } from 'next';
import { SITE, SITE_URL } from '@/lib/site';
import { TOPICS } from '@/lib/topics';

// Only the pages meant for search results. Profile pages are noindex, so they stay out.
export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date(`${SITE.lastUpdated} UTC`);
  return [
    { url: `${SITE_URL}/`, lastModified: updated, changeFrequency: 'weekly', priority: 1 },
    ...TOPICS.map((t) => ({ url: `${SITE_URL}/${t.slug}`, lastModified: updated, changeFrequency: 'monthly' as const, priority: 0.8 })),
    { url: `${SITE_URL}/compare`, lastModified: updated, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/profile/sample`, lastModified: updated, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/privacy`, lastModified: updated, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified: updated, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
