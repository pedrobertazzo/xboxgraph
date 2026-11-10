import Link from 'next/link';
import { cookies } from 'next/headers';
import { BacklogDetails } from './BacklogDetails';
import { Dashboard } from './Dashboard';
import { Footer } from './Footer';
import { Logo } from './Logo';
import { Medal, ScoreRing } from './Medal';
import { TileWall } from './TileWall';
import { OptedOut } from './OptedOut';
import { RememberProfile } from './Recent';
import { TopSearch } from './TopSearch';
import { env } from '@/lib/env';
import { clockQuery, readClock, readDashState } from '@/lib/layout';
import { isOptedOut } from '@/lib/optout';
import { XboxError, getXboxProfile } from '@/lib/xbox';
import { sampleProfile } from '@/lib/sample';
import { isComplete, milestone, xboxStats } from '@/lib/stats';
import { backlogOf } from '@/lib/backlog';
import { pageMeta } from '@/lib/site';
import { profilePath, type XboxProfile } from '@/lib/types';

export type Search = { p?: string; r?: string; n?: string; l?: string; tz?: string; h?: string };

// Shared links carry the sharer's clock, so the preview card shows their busiest hour.
export async function profileMetadata(id: string, sp: Search) {
  const q = clockQuery(readClock(sp.tz, sp.h)).toString();
  const path = profilePath({ id: decodeURIComponent(id) });
  const image = { url: `${path}/card.png${q ? `?${q}` : ''}`, width: 1200, height: 630 };
  // The sample is made-up data, so unlike real profiles it may appear in search results (it is in the sitemap).
  if (id === 'sample')
    return pageMeta(
      path,
      'Sample Xbox Achievement Dashboard',
      'See what an Xbox stats dashboard looks like: gamerscore, achievements, games at 100%, rarest achievements, backlog, play time and when you play, for a sample player.',
      image,
    );
  return {
    title: { absolute: `${decodeURIComponent(id)} · My Gaming Grid for Xbox` },
    robots: { index: false, follow: true },
    openGraph: { images: [image] },
    twitter: { card: 'summary_large_image', images: [image.url] },
  };
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <nav className="topbar">
        <Logo />
        <span className="topbar-end">
          <TopSearch />
        </span>
      </nav>
      <main className="landing">
        <section className="hero notice">
          <h1>{title}</h1>
          {children}
          <div className="actions">
            <Link className="btn ghost" href="/">Back to search</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export async function ProfileView({ id: raw, sp }: { id: string; sp: Search }) {
  const id = decodeURIComponent(raw);
  const sample = id === 'sample';
  if (!sample && isOptedOut(id)) return <OptedOut />;

  let profile: XboxProfile;
  try {
    profile = sample ? sampleProfile() : await getXboxProfile(id);
  } catch (e) {
    const err = e instanceof XboxError ? e : null;
    if (err?.code === 'private')
      return (
        <Notice title="This game history is private">
          <p className="lede"><b>{id}</b> keeps their games and achievements private, so Xbox won’t share them with anyone.</p>
          <p>
            If this is you: on your Xbox, open <i>Settings → Account → Privacy &amp; online safety → Xbox privacy → View details &amp; customize → Game content</i> and set
            <b> Others can see your game and app history</b> to <b>Everyone</b>. You can change the same setting at <i>account.xbox.com</i> under Privacy.
          </p>
          <div className="actions">
            <Link className="btn primary" href={profilePath({ id })}>Try again</Link>
          </div>
        </Notice>
      );
    return (
      <Notice title={err?.code === 'not_found' ? `No player called “${id}”` : 'Couldn’t load that profile'}>
        <p className="error">{err?.message ?? 'Xbox is not responding. Try again in a moment.'}</p>
        {err?.code === 'not_found' && <p>Check the spelling. Newer gamertags may need their number, like Gamertag#1234.</p>}
      </Notice>
    );
  }

  const path = profilePath(profile);
  const now = Date.now();
  const jar = await cookies();
  const clock = readClock(jar.get('tz')?.value, jar.get('hc')?.value);
  const stats = xboxStats(profile, now, clock);
  const pile = backlogOf(profile, now);
  const mile = milestone(profile.gamerscore);
  const unlocked = profile.games.reduce((s, g) => s + (g.achievements?.earned ?? 0), 0);
  const complete = profile.games.filter(isComplete).length;

  return (
    <>
      <nav className="topbar">
        <Logo />
        <span className="topbar-end">
          <TopSearch current={sample ? undefined : { id: profile.id, name: profile.name }} />
        </span>
      </nav>
      <main className="dash">
        <header className="profile banner">
          <TileWall className="banner-wall" still tiles={bannerTiles(profile)} />
          {profile.avatar ? <img className="avatar" src={profile.avatar} alt="" /> : <div className="avatar ph avatar-medal" aria-hidden><Medal kind="score" /></div>}
          <div className="who">
            <h1>
              {profile.name}
              {profile.tenure ? <span className="plus-badge" title={`${profile.tenure} years on Xbox`}>{profile.tenure} yrs</span> : null}
              {sample && <span className="tag">Sample data</span>}
            </h1>
            <p className="grades">
              <span className="grade score" title="Gamerscore">
                <Medal kind="score" />
                {profile.gamerscore.toLocaleString('en-US')}
                <span className="sr-only"> gamerscore</span>
              </span>
              <span className="grade" title="Achievements unlocked">
                <span className="grade-num">{unlocked.toLocaleString('en-US')}</span>
                <span className="grade-unit"> achievements</span>
              </span>
              <span className="grade complete" title="Games at 100%">
                <Medal kind="complete" />
                {complete.toLocaleString('en-US')}
                <span className="sr-only"> games at 100%</span>
              </span>
              <span className="games-count">{profile.games.length.toLocaleString('en-US')} games</span>
            </p>
            <p className="who-actions">
              <Link className="btn ghost small" href={sample ? '/compare/sample/samplerival' : `/compare?with=${encodeURIComponent(profile.id)}`}>
                Compare
              </Link>
            </p>
          </div>
          <ScoreRing score={profile.gamerscore} progress={Math.round(((profile.gamerscore - mile.prev) / (mile.next - mile.prev)) * 100)} club={mile.club} />
        </header>

        <Dashboard
          stats={stats}
          clock={clock}
          initialState={readDashState(sp, stats.map((s) => s.key))}
          details={pile ? { backlog: <BacklogDetails data={pile} /> } : {}}
          share={{ pageUrl: `${env.appUrl}${path}`, cardUrl: `${env.appUrl}${path}/card.png`, name: profile.name }}
        />
        {!sample && <RememberProfile id={profile.id} name={profile.name} avatar={profile.avatar} />}

        {profile.playHidden && <p className="note busy">Xbox didn’t share this player’s play time, so hours are hidden.</p>}
        {profile.unlocksHidden && <p className="note busy">Xbox didn’t share this player’s unlocked achievements, so rarity and when they play are hidden.</p>}
        <p className="note">
          Gamerscore and completion cover every game, Xbox 360 included. Play time covers Xbox One, Series X|S and PC; rarity and
          dates cover {profile.unlocksCapped ? 'the 5,000 most recent' : 'every'} Xbox One-era achievement. Data is cached for about an hour.
        </p>
      </main>
      <Footer />
    </>
  );
}

// The banner's wall: the player's own games, most played first, then most recent.
function bannerTiles(p: XboxProfile) {
  return [...p.games]
    .filter((g) => g.art ?? g.icon)
    .sort((a, b) => (b.playMin ?? 0) - (a.playMin ?? 0) || (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0))
    .slice(0, 24)
    .map((g) => ({ src: (g.art ?? g.icon)!, label: g.title }));
}
