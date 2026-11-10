import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Logo } from '@/components/Logo';
import { LandingPreview } from '@/components/LandingPreview';
import { TileWall } from '@/components/TileWall';
import { RecentProfiles } from '@/components/Recent';
import { SearchBox } from '@/components/SearchBox';
import { TopicLinks } from '@/components/TopicPage';
import { sampleProfile } from '@/lib/sample';
import { xboxStats } from '@/lib/stats';
import { AchievementToasts, type ToastItem } from '@/components/Toast';
import { SITE, SITE_URL } from '@/lib/site';

export const metadata = { alternates: { canonical: '/' } };

const FAQ: [string, React.ReactNode, string][] = [
  [
    'What can I see for my Xbox profile?',
    <>Your gamerscore and the next milestone, every achievement, the games you’ve taken to 100% and your finish rate, your rarest achievements, your backlog, play time for Xbox One, Series X|S and PC games, your favourite genres, an achievement calendar and when you play.</>,
    'Your gamerscore and the next milestone, every achievement, the games you’ve taken to 100% and your finish rate, your rarest achievements, your backlog, play time for Xbox One, Series X|S and PC games, your favourite genres, an achievement calendar and when you play.',
  ],
  [
    'Do I need to sign in?',
    <>No, and we’ll never ask for your Microsoft password. Type a gamertag and we read what Xbox already shows to anyone, as the Xbox app does when you look someone up.</>,
    'No, and we’ll never ask for your Microsoft password. Type a gamertag and we read what Xbox already shows to anyone, as the Xbox app does when you look someone up.',
  ],
  [
    'Why does it say my game history is private?',
    <>Stats need “Others can see your game and app history” set to Everyone. On Xbox: Settings → Account → Privacy & online safety → Xbox privacy → View details & customize → Game content. It’s also under Privacy at account.xbox.com.</>,
    'Stats need “Others can see your game and app history” set to Everyone. On Xbox: Settings → Account → Privacy & online safety → Xbox privacy → View details & customize → Game content. It’s also under Privacy at account.xbox.com.',
  ],
  [
    'Why is play time or rarity missing for some games?',
    <>Xbox only records play time, unlock dates and rarity for Xbox One, Series X|S and PC games, so Xbox 360 games show gamerscore and completion but no hours.</>,
    'Xbox only records play time, unlock dates and rarity for Xbox One, Series X|S and PC games, so Xbox 360 games show gamerscore and completion but no hours.',
  ],
  [
    'How fresh are the stats?',
    <>Profiles are kept for about an hour, so an achievement you just unlocked can take that long to show.</>,
    'Profiles are kept for about an hour, so an achievement you just unlocked can take that long to show.',
  ],
];

const FAQ_ICONS = [
  <svg key="stats" viewBox="0 0 24 24"><path d="M4 20V10M9.5 20V5M14.5 20v-7M20 20V8" /></svg>,
  <svg key="safe" viewBox="0 0 24 24"><path d="M12 3.5 19 6v5.5c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>,
  <svg key="privacy" viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>,
  <svg key="time" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></svg>,
  <svg key="fresh" viewBox="0 0 24 24"><path d="M20.5 12a8.5 8.5 0 1 1-2.5-6M20.5 3.5V8H16" /></svg>,
];

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: `${SITE.name} for Xbox`, inLanguage: 'en' },
    {
      '@type': 'WebApplication',
      name: `${SITE.name} for Xbox`,
      url: `${SITE_URL}/`,
      applicationCategory: 'GameApplication',
      operatingSystem: 'Any',
      description: 'See any public Xbox profile as a dashboard: gamerscore, achievements, games at 100%, rarest achievements, backlog, play time and when you play.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      author: { '@type': 'Person', name: SITE.operator },
    },
    { '@type': 'FAQPage', mainEntity: FAQ.map(([q, , a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ],
};

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string; q?: string }> }) {
  const { error, q } = await searchParams;
  const sample = sampleProfile();
  const stats = xboxStats(sample);
  const titles = new Map(sample.games.map((g) => [g.id, g.title]));
  // The pop-ups use the sample's unlocks, which a lean (OpenXBL) sample leaves out of its stats.
  const toasts: ToastItem[] = [...sampleProfile(undefined, { full: true }).unlocks]
    .sort((a, b) => b.score - a.score || (a.rarity ?? 100) - (b.rarity ?? 100))
    .filter((u, i, all) => all.findIndex((v) => v.titleId === u.titleId) === i)
    .slice(0, 6)
    .map((u) => ({ name: u.name, score: u.score, game: titles.get(u.titleId) ?? '', rare: (u.rarity ?? 100) <= 10 }));

  return (
    <>
      <nav className="topbar">
        <Logo />
      </nav>
      <main className="landing">
        <section className="hero split">
          <div>
            <h1>Your Xbox gamerscore and stats, <em>as a dashboard.</em></h1>
            <p className="lede">
              Gamerscore, achievements, your rarest unlocks, the games you’re close to 100%, your backlog and play time,
              from any public Xbox profile. No sign-in.
            </p>
            <SearchBox q={q} />
            {error && <p className="error" role="alert">{error}</p>}
            <RecentProfiles />
            <p className="hint">
              Or <Link href="/compare">compare two to four players</Link> side by side.
            </p>
          </div>
          <div className="hero-art">
            <TileWall tiles={sample.games.flatMap((g) => (g.art ? [{ src: g.art, label: g.title }] : []))} />
            <AchievementToasts items={toasts} />
          </div>
        </section>

        <LandingPreview stats={stats} />

        <section className="facts">
          <div>
            <h2>Any public profile</h2>
            <p>Type a gamertag. If its game history is public, you’ll see the dashboard in a few seconds.</p>
          </div>
          <div>
            <h2>No sign-in, ever</h2>
            <p>We never ask for your Microsoft password, and nothing is stored about who you look up.</p>
          </div>
          <div>
            <h2>Every stat, every card</h2>
            <p>Drag a stat into another row and it redraws itself: a chart, a big number, a cover wall or a heatmap. <Link href="/profile/sample">Try the sample →</Link></p>
          </div>
        </section>

        <section className="faq" aria-labelledby="faq-title">
          <div className="faq-head">
            <span className="faq-kicker">FAQ</span>
            <h2 id="faq-title">Questions</h2>
            <p>What the stats cover, privacy settings and how fresh the numbers are.</p>
            <Link href="/profile/sample" className="faq-link">See the sample profile <span aria-hidden>→</span></Link>
          </div>
          <div className="faq-list">
            {FAQ.map(([question, a], i) => (
              <details key={question} className="faq-item" open={i === 0}>
                <summary>
                  <span className="faq-ic" aria-hidden>{FAQ_ICONS[i % FAQ_ICONS.length]}</span>
                  <span className="faq-q">{question}</span>
                  <span className="faq-chev" aria-hidden />
                </summary>
                <div className="faq-a">
                  <p>{a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>
        <TopicLinks />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, '\\u003c') }} />
      </main>
      <Footer />
    </>
  );
}
