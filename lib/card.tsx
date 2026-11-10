import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { isOptedOut } from './optout';
import { C, Logo, firstOk } from './og';
import { validTimeZone } from './layout';
import { XboxError, getXboxProfile } from './xbox';
import { sampleProfile } from './sample';
import { fmtG, fmtHours, isComplete, milestone, xboxStats } from './stats';
import type { Game, Stat, XboxProfile } from './types';

const W = 1200;
const H = 630;
const HEADERS = { 'Cache-Control': 'public, max-age=900, s-maxage=1800, stale-while-revalidate=86400' };
const SHORT = { 'Cache-Control': 'public, max-age=60, s-maxage=60' };
const ellipsis = { overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' };
const panel = { background: C.panel, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' };
const nf = (n: number) => Math.round(n).toLocaleString('en-US');

function Message({ title, body }: { title: string; body: string }) {
  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 56, background: `linear-gradient(160deg, ${C.bg}, ${C.deep})`, color: C.text }}>
        <Logo />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 56, color: C.bright }}>{title}</div>
          <div style={{ fontSize: 28, color: C.dim, maxWidth: 900 }}>{body}</div>
        </div>
        <div style={{ fontSize: 18, color: '#5a7359' }}>Not affiliated with Microsoft.</div>
      </div>
    ),
    { width: W, height: H, headers: SHORT },
  );
}

type Tile = { value: string; label: string; sub: string; color?: string };

function tiles(s: Record<string, Stat>): Tile[] {
  const out: (Tile | null)[] = [
    s.achievements && { value: s.achievements.display, label: 'achievements', sub: `${s.achievements.progress.label.split(' ')[0]} of those on offer` },
    s.completed && { value: s.completed.display, label: 'games at 100%', sub: s.completed.series[0]?.label ?? '', color: C.gold },
    s.rarest && { value: s.rarest.display, label: 'rarest unlock', sub: s.rarest.series[0]?.label ?? '', color: C.rare },
    s.playtime && { value: s.playtime.display, label: 'hours played', sub: s.top?.cover?.label ? `most in ${s.top.cover.label}` : '' },
    s.finishrate && { value: s.finishrate.display, label: 'finish rate', sub: s.finishrate.tag ?? '' },
    s.completion && { value: s.completion.display, label: 'completion', sub: 'average per game' },
    s.when && { value: s.when.display, label: 'busiest hour', sub: s.when.tag ?? '' },
    s.almost && { value: s.almost.display, label: 'almost 100%', sub: s.almost.series[0]?.label ?? '' },
  ];
  return out.filter((t): t is Tile => !!t).slice(0, 6);
}

export async function cardResponse(req: Request, id: string) {
  const q = new URL(req.url).searchParams;
  const clock = { tz: validTimeZone(q.get('tz')), h12: q.get('h') !== '24' };
  const sample = id === 'sample';
  if (!sample && isOptedOut(id)) return Message({ title: 'Opted out', body: 'This player asked not to have their stats shown.' });
  let profile: XboxProfile;
  try {
    profile = sample ? sampleProfile() : await getXboxProfile(id);
  } catch (e) {
    return Message({ title: id, body: e instanceof XboxError ? e.message : 'Xbox is not responding right now.' });
  }
  const s = Object.fromEntries(xboxStats(profile, Date.now(), clock).map((x) => [x.key, x]));
  // The sample's covers live in public/, so they're inlined; image fetches back to this server are refused.
  const local = async (u: string | null) => {
    if (!u?.startsWith('/')) return null;
    try {
      const file = await readFile(path.join(process.cwd(), 'public', u));
      return `data:${u.endsWith('.svg') ? 'image/svg+xml' : 'image/png'};base64,${file.toString('base64')}`;
    } catch {
      return null;
    }
  };
  const pick = async (urls: (string | null)[]) => {
    for (const u of urls) {
      const inline = await local(u);
      if (inline) return inline;
    }
    return firstOk(urls.filter((u) => u && !u.startsWith('/')));
  };
  const top = [...profile.games].filter((g) => g.playMin).sort((a, b) => b.playMin! - a.playMin!)[0] ?? profile.games[0];
  const done = (g: Game) => g.lastUnlock ?? g.lastPlayed ?? 0;
  const plats = profile.games.filter(isComplete).sort((a, b) => done(b) - done(a)).slice(0, 5);
  const mile = milestone(profile.gamerscore);
  const [avatar, heroArt, ...platArt] = await Promise.all([pick([profile.avatar]), top ? pick([top.art, top.icon]) : null, ...plats.map((g: Game) => pick([g.art, g.icon]))]);
  const grid = tiles(s);

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', padding: '38px 48px 34px', gap: 24, background: `radial-gradient(900px 400px at 85% -10%, rgba(16, 124, 16, 0.35), transparent), linear-gradient(160deg, #1d211d, ${C.bg} 45%, ${C.deep})`, color: C.text }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {avatar ? <img src={avatar} width={76} height={76} style={{ borderRadius: 38, border: `3px solid ${C.green}` }} /> : <div style={{ display: 'flex', width: 76, height: 76, borderRadius: 38, background: C.ph }} />}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 6, minWidth: 0 }}>
            <div style={{ display: 'flex', fontSize: 42, color: C.bright, lineHeight: 1.1, ...ellipsis }}>{profile.name}</div>
            <div style={{ display: 'flex', gap: 18, fontSize: 21 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.text }}>
                <div style={{ display: 'flex', width: 14, height: 14, borderRadius: 7, background: C.green }} />
                {nf(profile.games.reduce((a, g) => a + (g.achievements?.earned ?? 0), 0))} achievements
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.text }}>
                <div style={{ display: 'flex', width: 14, height: 14, borderRadius: 7, background: C.gold }} />
                {nf(profile.games.filter(isComplete).length)} at 100%
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.dim }}>{nf(profile.games.length)} games</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 18px', ...panel, borderRadius: 12 }}>
            <div style={{ display: 'flex', fontSize: 13, letterSpacing: 2, color: C.dim }}>GAMERSCORE</div>
            <div style={{ display: 'flex', fontSize: 40, color: C.green, lineHeight: 1 }}>{fmtG(profile.gamerscore)}</div>
            <div style={{ display: 'flex', fontSize: 13, color: C.dim, marginTop: 4 }}>{mile.club}</div>
          </div>
          <Logo />
        </div>

        <div style={{ display: 'flex', gap: 24, flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: 360, overflow: 'hidden', ...panel }}>
            {heroArt ? <img src={heroArt} width={360} height={260} style={{ objectFit: 'cover' }} /> : <div style={{ display: 'flex', width: 360, height: 260, background: C.ph }} />}
            {top && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 18px' }}>
                <div style={{ display: 'flex', fontSize: 13, letterSpacing: 2, color: C.blue }}>MOST PLAYED</div>
                <div style={{ display: 'flex', fontSize: 25, color: C.bright, ...ellipsis }}>{top.title}</div>
                <div style={{ display: 'flex', fontSize: 17, color: C.dim }}>{[top.playMin ? fmtHours(top.playMin) : null, top.achievements?.maxScore ? `${fmtG(top.achievements.score)} of ${fmtG(top.achievements.maxScore)}` : null].filter(Boolean).join(' · ')}</div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {grid.map((t) => (
                <div key={t.label} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: 224, height: 112, padding: '0 18px', ...panel, borderTop: `3px solid ${t.color ?? 'rgba(196, 218, 198,0.5)'}` }}>
                  <div style={{ display: 'flex', fontSize: 36, color: t.color ?? C.bright, lineHeight: 1, whiteSpace: 'nowrap' }}>{t.value}</div>
                  <div style={{ display: 'flex', fontSize: 17, color: C.blue, marginTop: 7 }}>{t.label}</div>
                  {t.sub && <div style={{ display: 'flex', fontSize: 14, color: C.dim, marginTop: 3, ...ellipsis }}>{t.sub}</div>}
                </div>
              ))}
            </div>
            {plats.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', fontSize: 13, letterSpacing: 2, color: C.gold }}>LATEST 100% GAMES</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {plats.map((g, i) =>
                    platArt[i] ? (
                      <img key={g.id} src={platArt[i]!} width={88} height={88} style={{ borderRadius: 10, objectFit: 'cover', border: `2px solid ${C.gold}` }} />
                    ) : (
                      <div key={g.id} style={{ display: 'flex', width: 88, height: 88, borderRadius: 10, background: C.ph }} />
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { width: W, height: H, headers: HEADERS },
  );
}
