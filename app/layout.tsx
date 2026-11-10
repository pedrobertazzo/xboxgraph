import type { Metadata, Viewport } from 'next';
import { Figtree, Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import 'morphgrid/styles.css';
import './globals.css';
import { SITE, SITE_URL } from '@/lib/site';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });
// Headings and big numbers.
const display = Figtree({ subsets: ['latin'], variable: '--font-display' });

const DESCRIPTION =
  'Any public Xbox profile as a dashboard: gamerscore, achievements, games at 100%, rarest achievements, play time and your backlog. Free, no sign-in.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Xbox Gamerscore & Achievement Stats Dashboard | My Gaming Grid', template: '%s | My Gaming Grid' },
  description: DESCRIPTION,
  applicationName: 'My Gaming Grid',
  authors: [{ name: SITE.operator }],
  creator: SITE.operator,
  category: 'games',
  keywords: ['Xbox gamerscore', 'Xbox achievements', 'rarest Xbox achievements', 'Xbox play time', 'Xbox stats'],
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'My Gaming Grid',
    locale: 'en_US',
    title: 'Xbox Gamerscore & Achievement Stats Dashboard',
    description: DESCRIPTION,
    images: [{ url: '/profile/sample/card.png', width: 1200, height: 630, alt: 'A sample My Gaming Grid card for an Xbox profile' }],
  },
  twitter: { card: 'summary_large_image', images: ['/profile/sample/card.png'] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
};

export const viewport: Viewport = { themeColor: '#0b0c0b', colorScheme: 'dark' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
