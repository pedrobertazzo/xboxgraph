import Link from 'next/link';
import { CompareStart } from '@/components/CompareStart';
import { Footer } from '@/components/Footer';
import { Logo } from '@/components/Logo';
import { pageMeta } from '@/lib/site';

export const metadata = {
  ...pageMeta('/compare', 'Compare Xbox Profiles', 'Compare two to four Xbox players side by side: gamerscore, achievements, games at 100%, rare achievements, play time and the games you share.'),
  title: { absolute: 'Compare Xbox Profiles | My Gaming Grid' },
};

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ p?: string | string[]; with?: string; error?: string }> }) {
  const sp = await searchParams;
  const initial = [sp.with, ...(Array.isArray(sp.p) ? sp.p : sp.p ? [sp.p] : [])].filter((x): x is string => !!x);
  return (
    <>
      <nav className="topbar">
        <Logo />
      </nav>
      <main className="landing">
        <section className="hero compare-hero">
          <h1>
            Compare <em>Xbox players.</em>
          </h1>
          <p className="lede">
            Two to four gamertags, side by side: gamerscore, achievements, games at 100%, rare achievements, play time, and the games you share with who’s further
            along in each. Try it with <Link href="/compare/sample/samplerival">two sample players</Link>.
          </p>
          <CompareStart initial={initial} error={sp.error} />
        </section>
      </main>
      <Footer />
    </>
  );
}
