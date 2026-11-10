import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Logo } from '@/components/Logo';
import { TopSearch } from '@/components/TopSearch';
import { FitImg } from '@/components/FitImg';
import { Medal, ScoreRing } from '@/components/Medal';
import { compareRows, isComplete, leaders, onlyCompleted, parseIds, sharedGames } from '@/lib/compare';
import { isOptedOut } from '@/lib/optout';
import { XboxError, getXboxProfile } from '@/lib/xbox';
import { sampleProfile, sampleRival } from '@/lib/sample';
import { milestone } from '@/lib/stats';
import { profilePath, type XboxProfile } from '@/lib/types';

type Props = { params: Promise<{ ids: string[] }> };

export async function generateMetadata({ params }: Props) {
  const ids = parseIds((await params).ids);
  return { title: { absolute: `${ids.join(' vs ')} · Compare · My Gaming Grid for Xbox` }, robots: { index: false, follow: true } };
}

const load = (id: string): Promise<XboxProfile> => (id === 'sample' ? Promise.resolve(sampleProfile()) : id === 'samplerival' ? Promise.resolve(sampleRival()) : getXboxProfile(id));
const ringOf = (p: XboxProfile) => {
  const m = milestone(p.gamerscore);
  return { progress: Math.round(((p.gamerscore - m.prev) / (m.next - m.prev)) * 100), club: m.club };
};

export default async function CompareView({ params }: Props) {
  const ids = parseIds((await params).ids);
  const results = await Promise.all(
    ids.map(async (id) => {
      if (isOptedOut(id)) return { id, error: 'This player opted out.' };
      try {
        return { id, profile: await load(id) };
      } catch (e) {
        return { id, error: e instanceof XboxError ? e.message : 'Xbox is not responding.' };
      }
    }),
  );
  const failed = results.filter((r) => 'error' in r);
  const ps = results.flatMap((r) => ('profile' in r && r.profile ? [r.profile] : []));

  if (ps.length < 2)
    return (
      <>
        <nav className="topbar"><Logo /></nav>
        <main className="landing">
          <section className="hero notice">
            <h1>Couldn’t compare those players</h1>
            {failed.map((f) => (
              <p key={f.id} className="error"><b>{f.id}</b>: {'error' in f ? f.error : ''}</p>
            ))}
            <div className="actions">
              <Link className="btn primary" href={`/compare?${ids.map((i) => `p=${encodeURIComponent(i)}`).join('&')}`}>Change players</Link>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );

  const rows = compareRows(ps);
  const lead = leaders(rows);
  const wins = ps.map((_, i) => lead.filter((l) => l === i).length);
  const shared = sharedGames(ps);
  const only = onlyCompleted(ps);
  const top = wins.indexOf(Math.max(...wins));
  const clear = wins.filter((w) => w === wins[top]).length === 1;

  return (
    <>
      <nav className="topbar">
        <Logo />
        <span className="topbar-end"><TopSearch /></span>
      </nav>
      <main className="dash compare" style={{ ['--n' as string]: ps.length }}>
        <section className="cmp-players">
          {ps.map((p, i) => (
            <Link key={p.id} href={profilePath(p)} className={`cmp-player p${i}`}>
              {p.avatar ? <img className="avatar" src={p.avatar} alt="" /> : <span className="avatar ph avatar-medal"><Medal kind="score" /></span>}
              <span className="cmp-name">{p.name}</span>
              <span className="grades">
                <span className="grade complete" title="Games at 100%"><Medal kind="complete" />{p.games.filter(isComplete).length.toLocaleString('en-US')}</span>
                <span className="grade" title="Achievements">{p.games.reduce((s, g) => s + (g.achievements?.earned ?? 0), 0).toLocaleString('en-US')} achievements</span>
              </span>
              <ScoreRing score={p.gamerscore} {...ringOf(p)} />
              <span className="cmp-wins">{wins[i]} of {rows.length} leads</span>
            </Link>
          ))}
        </section>
        <p className="cmp-verdict">
          {clear ? <><b>{ps[top].name}</b> leads {wins[top]} of the {rows.length} head-to-heads.</> : 'Too close to call: the head-to-heads are shared.'}{' '}
          {shared.length > 0 && <>You share <b>{shared.length.toLocaleString('en-US')}</b> {shared.length === 1 ? 'game' : 'games'} with achievements.</>}
        </p>
        {failed.length > 0 && <p className="note busy">{failed.map((f) => `${f.id}: ${'error' in f ? f.error : ''}`).join(' ')}</p>}

        <section className="cmp-section">
          <h2>Head to head</h2>
          <div className="cmp-rows">
            {rows.map((r, k) => {
              const max = Math.max(...r.values, 1);
              return (
                <div key={r.key} className="cmp-row">
                  <h3>{r.label}</h3>
                  {r.values.map((v, i) => (
                    <div key={i} className={`cmp-bar p${i}${lead[k] === i ? ' lead' : ''}`}>
                      <span className="cmp-who">{ps[i].name}</span>
                      <span className="cmp-track"><i style={{ width: `${Math.max(2, (v / max) * 100)}%` }} /></span>
                      <b>{r.display[i]}</b>
                    </div>
                  ))}
                  {r.note && <p className="cmp-note">{r.note}</p>}
                </div>
              );
            })}
          </div>
        </section>

        {shared.length > 0 && (
          <section className="cmp-section">
            <h2>Games you share</h2>
            <p className="cmp-sub">Completion in each game you both (or all) have achievements in. A medal marks 100%.</p>
            <div className="cmp-games">
              {shared.slice(0, 24).map((s) => (
                <article key={s.id} className="cmp-game">
                  <FitImg src={s.art} className="cmp-art" />
                  <h3>{s.title}</h3>
                  {s.progress.map((v, i) => (
                    <div key={i} className={`cmp-bar small p${i}`}>
                      <span className="cmp-who">{ps[i].name}</span>
                      <span className="cmp-track"><i style={{ width: `${v ?? 0}%` }} /></span>
                      <b>{v == null ? '—' : `${v}%`}{s.complete[i] && <Medal kind="complete" />}</b>
                    </div>
                  ))}
                </article>
              ))}
            </div>
            {shared.length > 24 && <p className="cmp-sub">And {shared.length - 24} more.</p>}
          </section>
        )}

        {only.some((o) => o.length) && (
          <section className="cmp-section">
            <h2>100% games only one of you has</h2>
            <div className="cmp-only">
              {ps.map((p, i) => (
                <div key={p.id} className={`cmp-only-col p${i}`}>
                  <h3>{p.name}</h3>
                  {only[i].length ? (
                    <ul>
                      {only[i].slice(0, 6).map((g) => (
                        <li key={g.id}>
                          <FitImg src={g.art ?? g.icon} className="cmp-thumb" />
                          <span>{g.title}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="cmp-sub">None the others don’t have.</p>
                  )}
                  {only[i].length > 6 && <p className="cmp-sub">+{only[i].length - 6} more</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="note">
          Comparisons use gamerscore, completion, play time and up to 5,000 recent unlocks per player.{' '}
          <Link href={`/compare?${ps.map((p) => `p=${encodeURIComponent(p.id)}`).join('&')}`}>Change players</Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
