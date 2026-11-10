import Link from 'next/link';
import { FitImg } from './FitImg';
import { Footer } from './Footer';
import { Logo } from './Logo';
import { SearchBox } from './SearchBox';
import { sampleProfile } from '@/lib/sample';
import { SITE, SITE_URL } from '@/lib/site';
import { xboxStats } from '@/lib/stats';
import { TOPICS, type Topic } from '@/lib/topics';

// A landing page for one search topic: what it shows, those cards filled in from the sample player, a search box, FAQ.
export function TopicPage({ t }: { t: Topic }) {
  const all = xboxStats(sampleProfile());
  const shown = t.stats.flatMap(([key, about]) => {
    const s = all.find((x) => x.key === key);
    return s ? [{ s, about }] : [];
  });
  const url = `${SITE_URL}/${t.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': `${url}#page`, url, name: t.title, description: t.description, inLanguage: 'en', isPartOf: { '@id': `${SITE_URL}/#website` } },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: `${SITE.name} for Xbox`, item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: t.h1, item: url },
        ],
      },
      { '@type': 'FAQPage', mainEntity: t.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  };

  return (
    <>
      <nav className="topbar">
        <Logo />
      </nav>
      <main className="landing topic">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link> <span aria-hidden>/</span> <span>{t.h1}</span>
        </nav>
        <section className="hero">
          <h1>{t.h1}</h1>
          <p className="lede">{t.lede}</p>
          <SearchBox />
        </section>

        <section className="facts">
          {t.sections.map(([h, p]) => (
            <div key={h}>
              <h2>{h}</h2>
              <p>{p}</p>
            </div>
          ))}
        </section>

        <section className="topic-stats" aria-labelledby="ts-title">
          <h2 id="ts-title">What you’ll see</h2>
          <p className="topic-note">
            Filled in from our <Link href="/profile/sample">sample player</Link> and their made-up games; yours will show your own.
          </p>
          <div className="topic-grid">
            {shown.map(({ s, about }) => (
              <article key={s.key} className="topic-card">
                {s.cover?.poster && <FitImg src={s.cover.poster} className="topic-art" />}
                <h3>{s.title}</h3>
                <p className="topic-about">{about}</p>
                <p className="topic-figure">
                  <b>{s.display}</b> {s.unit && <span>{s.unit}</span>}
                </p>
                {s.line && <p className="topic-line">{s.line}</p>}
              </article>
            ))}
          </div>
        </section>

        <section className="faq" aria-labelledby="faq-title">
          <div className="faq-head">
            <span className="faq-kicker">FAQ</span>
            <h2 id="faq-title">Questions</h2>
            <Link href="/profile/sample" className="faq-link">See the full sample dashboard <span aria-hidden>→</span></Link>
          </div>
          <div className="faq-list">
            {t.faq.map(([q, a], i) => (
              <details key={q} className="faq-item" open={i === 0}>
                <summary>
                  <span className="faq-q">{q}</span>
                  <span className="faq-chev" aria-hidden />
                </summary>
                <div className="faq-a">
                  <p>{a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        <TopicLinks current={t.slug} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      </main>
      <Footer />
    </>
  );
}

// Links between the topic pages, also shown on the home page, so each one is a click from anywhere on the site.
export function TopicLinks({ current }: { current?: string }) {
  return (
    <nav className="topic-links" aria-label="More Xbox stats">
      <h2>More Xbox stats</h2>
      <ul>
        {TOPICS.filter((t) => t.slug !== current).map((t) => (
          <li key={t.slug}>
            <Link href={`/${t.slug}`}>{t.h1}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
