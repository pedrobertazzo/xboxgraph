// A bold X with curved arms that flare at the tips, and tilted rounded tiles, in the site's own white and green. The X
// nods to Xbox without copying its logo: it's drawn for this site and never sits in a sphere.
export type ShapeKind = 'mark' | 'tile' | 'ring';

// One filled outline: four arms pinched at the centre, curving out to wide, rounded tips.
const MARK = 'M12 14C30 10 44 30 50 40 56 30 70 10 88 14 84 32 62 44 58 50 62 56 84 68 88 86 70 90 56 70 50 60 44 70 30 90 12 86 16 68 38 56 42 50 38 44 16 32 12 14Z';

export function Shape({ kind, className, style }: { kind: ShapeKind; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" className={`shape ${kind}${className ? ' ' + className : ''}`} style={style} aria-hidden>
      {kind === 'tile' ? (
        <rect x="14" y="14" width="72" height="72" rx="12" fill="none" stroke="currentColor" strokeWidth="6" />
      ) : kind === 'ring' ? (
        <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="6" />
      ) : (
        <path d={MARK} fill="currentColor" />
      )}
    </svg>
  );
}

// A loose field of big outlines that float slowly, for the landing page's hero. Positions are fixed so the server and
// browser draw the same thing.
const FIELD: [ShapeKind, number, number, number, number, number][] = [
  // kind, left %, top %, size px, rotation deg, delay s
  ['tile', 6, 12, 140, -8, 0],
  ['mark', 44, 2, 260, 0, 1.2],
  ['tile', 70, 54, 130, 12, 0.6],
  ['mark', 12, 60, 90, -10, 1.8],
  ['ring', 4, 80, 56, 0, 2.4],
  ['mark', 86, 18, 64, 8, 1.5],
  ['tile', 86, 80, 50, -12, 2.1],
];

export function ShapeField() {
  return (
    <div className="shape-field" aria-hidden>
      {FIELD.map(([kind, left, top, size, rot, delay], i) => (
        <Shape
          key={i}
          kind={kind}
          className={size > 100 ? 'big' : 'small'}
          style={{ left: `${left}%`, top: `${top}%`, width: size, height: size, ['--r' as string]: `${rot}deg`, animationDelay: `${-delay * 2}s` }}
        />
      ))}
    </div>
  );
}
