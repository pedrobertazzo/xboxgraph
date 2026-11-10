import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Logo } from '@/components/Logo';
import { SITE, pageMeta } from '@/lib/site';

export const metadata = pageMeta('/privacy', 'Privacy policy', `What ${SITE.name} reads from public Xbox profiles, what it keeps, and how to opt out.`);

export default function Privacy() {
  const mail = <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>;
  return (
    <>
      <nav className="topbar">
        <Logo />
      </nav>
      <main className="legal">
        <h1>Privacy policy</h1>
        <p className="legal-meta">Last updated {SITE.lastUpdated}</p>

        <p className="legal-lede">
          {SITE.name} turns public Xbox profiles into a dashboard of achievement and play stats. We don’t have accounts or a
          database, and we only use what Xbox already shows to anyone who looks you up. This page explains what that
          means for you, whether you visit the site or someone looks up your profile.
        </p>

        <h2>Who runs this site</h2>
        <p>
          {SITE.name} is run by {SITE.operator}, based in {SITE.country}. For anything about privacy, including the requests
          described below, contact {mail}.
        </p>

        <h2>What we show about players</h2>
        <p>When someone looks up a gamertag, the site reads, through its own Xbox account:</p>
        <ul>
          <li>Profile basics: gamertag, gamerpic, gamerscore and years on Xbox.</li>
          <li>The game history: every game played, its achievement and gamerscore totals, when it was last played, and its genres and release date from the Xbox store.</li>
          <li>Play time per game, for Xbox One, Series X|S and PC games.</li>
          <li>Unlocked achievements (up to the 5,000 most recent): each one’s name, gamerscore, unlock time and rarity.</li>
        </ul>
        <p>
          From this we calculate the stats on the page, such as your finish rate or hours left in your backlog. Xbox only
          shares this when the player’s privacy settings allow anyone to see their game history. If they don’t, we can’t see
          it either.
        </p>

        <h2>Why we use it</h2>
        <p>
          We rely on legitimate interests (Article 6(1)(f) of the GDPR): letting players explore and share gaming stats they
          have chosen to make public on Xbox. We limit the impact by using only public data, not keeping it, not
          selling it, not building profiles of people over time, keeping profile pages out of search engines, and honouring
          opt-out requests.
        </p>

        <h2>What we keep, and for how long</h2>
        <ul>
          <li><b>No database, no accounts.</b> We don’t store profiles, search history or who looked up whom.</li>
          <li>
            <b>Short-lived caches.</b> To go easy on Xbox’s servers, answers are kept in a cache shared by our servers (Upstash Redis), for limited times: a profile
            for an hour. Shared images are cached for up to 30 minutes.
          </li>
          <li>
            <b>Where.</b> The site runs on Vercel and the cache on Upstash, both in the United States. Each entry deletes itself
            when its time is up; nothing is kept beyond that.
          </li>
          <li>
            <b>Your browser.</b> The site saves profiles you recently viewed and whether you’ve seen the introduction guide in
            your browser’s local storage. They never leave your device.
          </li>
          <li>
            <b>Your clock.</b> Two small cookies hold your time zone and hour format, so time-of-day stats are drawn in your
            local time. They expire after a year.
          </li>
        </ul>

        <h2>Visiting the site</h2>
        <ul>
          <li>The site is hosted by Vercel, which processes your IP address and basic request information to deliver pages and protect against abuse.</li>
          <li>Gamerpics and game art load directly from Xbox’s image servers, so Microsoft can see your IP address when they load.</li>
          <li>We count page views with Vercel Web Analytics, which uses no cookies and shows us only totals.</li>
          <li>We don’t use advertising or tracking cookies; the only cookies are the two clock settings above.</li>
        </ul>

        <h2 id="opt-out">Your choices</h2>
        <ul>
          <li>
            <b>Opt out.</b> Email {mail} from any address with your gamertag, and we’ll stop showing your profile and generate
            no images of your stats.
          </li>
          <li>
            <b>Make your game history private.</b> Setting “Others can see your game and app history” to Friends or Block in
            your Xbox privacy settings stops us, and every other site, from seeing it. Changes show here within about an hour.
          </li>
        </ul>

        <h2>Children</h2>
        <p>We show only what Xbox already shows publicly, and we don’t knowingly do anything beyond that.</p>

        <h2>Changes</h2>
        <p>If this policy changes, we’ll update this page and the date at the top. See also our <Link href="/terms">terms of use</Link>.</p>
      </main>
      <Footer />
    </>
  );
}
