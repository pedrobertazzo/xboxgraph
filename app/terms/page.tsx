import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Logo } from '@/components/Logo';
import { SITE, pageMeta } from '@/lib/site';

export const metadata = pageMeta('/terms', 'Terms of use', `The terms for using ${SITE.name}, a free stats dashboard for public Xbox profiles.`);

export default function Terms() {
  const mail = <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>;
  return (
    <>
      <nav className="topbar">
        <Logo />
      </nav>
      <main className="legal">
        <h1>Terms of use</h1>
        <p className="legal-meta">Last updated {SITE.lastUpdated}</p>

        <p className="legal-lede">
          By using {SITE.name} you agree to these terms. They’re short, and they mostly ask you to use the site fairly.
        </p>

        <h2>The service</h2>
        <p>
          {SITE.name} shows stats based on public Xbox profiles. It’s free, has no accounts and no sign-in, and is run
          by {SITE.operator}.
        </p>

        <h2>Not affiliated with Microsoft</h2>
        <p>
          {SITE.name} is an independent project. It isn’t endorsed by, sponsored by or affiliated with Microsoft. Xbox is
          a trademark of the Microsoft group of companies. Game names and artwork belong to
          their owners and are shown only to identify the games.
        </p>

        <h2>Xbox data</h2>
        <p>
          Stats come from Xbox Live, read with the site’s own account. They can be incomplete, delayed or wrong (for example,
          rarity and unlock dates only cover Xbox One-era achievements, and play time doesn’t exist for Xbox 360 games), and
          the site may stop working if Xbox changes. Don’t rely on them for
          anything important.
        </p>

        <h2>Using the site fairly</h2>
        <p>You agree not to:</p>
        <ul>
          <li>use the site to harass, stalk, threaten or embarrass anyone, including through comparisons or shared images;</li>
          <li>scrape the site, send automated or bulk requests, or try to get around its limits;</li>
          <li>misrepresent shared stats, or present the site or its images as Microsoft’s or Xbox’s;</li>
          <li>try to break, overload or misuse the site, or use it to overload Xbox’s servers.</li>
        </ul>
        <p>We may block access for anyone who doesn’t follow these rules.</p>

        <h2>Sharing</h2>
        <p>
          You can share links and images of dashboards. You’re responsible for what you share and where. If a profile isn’t
          yours, consider whether its owner would mind. Players can opt out at any time, as described in our{' '}
          <Link href="/privacy#opt-out">privacy policy</Link>.
        </p>

        <h2>No warranty</h2>
        <p>
          The site is provided “as is”, without warranties of any kind. It may change, be unavailable or stop working, for
          example if Xbox changes or restricts access.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the extent the law allows, {SITE.operator} isn’t liable for any loss or damage arising from using or not being
          able to use the site. Nothing in these terms limits liability that can’t be limited by law.
        </p>

        <h2>Changes and contact</h2>
        <p>
          We may update these terms; the date at the top shows the latest version. These terms are governed by the laws of{' '}
          {SITE.country}. Questions: {mail}.
        </p>
      </main>
      <Footer />
    </>
  );
}
