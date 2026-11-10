import { useId } from 'react';

// Our own badges, drawn for this site (not Xbox's artwork): a gamerscore coin with a G, a 100% medal with a tick, and
// a cut gem for rare achievements.
export type MedalKind = 'score' | 'complete' | 'rare';

const TONES: Record<MedalKind, [string, string, string]> = {
  score: ['#d9ffc4', '#5fd35f', '#0f6b12'],
  complete: ['#fff3c4', '#f2c14e', '#9a6a12'],
  rare: ['#f0e6ff', '#b48cff', '#5b3bb3'],
};

export function Medal({ kind, className, title }: { kind: MedalKind; className?: string; title?: string }) {
  const id = useId();
  const [hi, mid, lo] = TONES[kind];
  return (
    <svg viewBox="0 0 24 24" className={'medal ' + kind + (className ? ' ' + className : '')} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={hi} />
          <stop offset=".5" stopColor={mid} />
          <stop offset="1" stopColor={lo} />
        </linearGradient>
      </defs>
      {kind === 'score' && (
        <>
          <circle cx="12" cy="12" r="10" fill={`url(#${id})`} />
          <circle cx="12" cy="12" r="7.6" fill="none" stroke="#0b2a0c" strokeOpacity=".35" strokeWidth="1" />
          <path d="M15.6 9.2A4.3 4.3 0 1 0 16 13h-3.6" fill="none" stroke="#0b2a0c" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {kind === 'complete' && (
        <>
          <path d="M8 2.5h8l-1.6 5.2H9.6z" fill={lo} />
          <circle cx="12" cy="14.2" r="7.3" fill={`url(#${id})`} />
          <circle cx="12" cy="14.2" r="5.2" fill="none" stroke="#3b2a00" strokeOpacity=".3" strokeWidth="1" />
          <path d="m9 14.3 2.1 2.1 4-4.1" fill="none" stroke="#3b2a00" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {kind === 'rare' && (
        <>
          <path d="M7 3.5h10l4.5 5.5L12 21 2.5 9z" fill={`url(#${id})`} />
          <path d="M2.5 9h19M7 3.5 9.6 9 12 21M17 3.5 14.4 9 12 21M9.6 9 12 3.5 14.4 9" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth=".9" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

// The gamerscore emblem: a ring that fills towards the next milestone, the coin above the score.
export function ScoreRing({ score, progress, club }: { score: number; progress: number; club: string }) {
  const short = score >= 100_000 ? `${Math.round(score / 1000)}K` : score.toLocaleString('en-US');
  return (
    <div className="score-ring" title={`${score.toLocaleString('en-US')} gamerscore · ${club} · ${progress}% of the way to the next milestone`}>
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="44" className="ring-back" />
        <circle cx="50" cy="50" r="44" className="ring" pathLength={100} strokeDasharray={`${progress} 100`} transform="rotate(-90 50 50)" />
      </svg>
      <Medal kind="score" className="ring-coin" />
      <b>{short}</b>
      <span>{club}</span>
    </div>
  );
}
