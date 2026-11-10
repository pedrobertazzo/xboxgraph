// A curved X (two crescent arms crossing) and tilted rounded tiles, in the site's own white and green. The X nods to
// Xbox without copying its logo: no sphere around it, our own curves, and one colour.
export type ShapeKind = 'mark' | 'tile' | 'ring';

// Each arm is a crescent, pointed at both ends and full in the middle, bowing away from the other arm.
const ARMS = ['M22 10Q76 22 88 90Q38 66 22 10Z', 'M78 10Q24 22 12 90Q62 66 78 10Z'];

export function Shape({ kind, className, style }: { kind: ShapeKind; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" className={`shape ${kind}${className ? ' ' + className : ''}`} style={style} aria-hidden>
      {kind === 'tile' ? (
        <rect x="14" y="14" width="72" height="72" rx="12" fill="none" stroke="currentColor" strokeWidth="6" />
      ) : kind === 'ring' ? (
        <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="6" />
      ) : (
        ARMS.map((d) => <path key={d} d={d} fill="currentColor" style={{ fillOpacity: 'var(--fill, 0.14)' }} stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />)
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
