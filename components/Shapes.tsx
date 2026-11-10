// Gamepad face letters (A, B, X, Y) as plain outlined rings, and tilted rounded tiles, in the site's own white and
// green. They nod to a controller and a console's home screen without copying either: one colour, never in the
// controller's diamond, and no logos.
export type ShapeKind = 'a' | 'b' | 'x' | 'y' | 'tile' | 'ring';

const LETTER: Record<'a' | 'b' | 'x' | 'y', string> = {
  a: 'M38 66 50 32l12 34M42.5 55h15',
  b: 'M41 32v36M41 32h10a8 8 0 0 1 0 16H41M41 48h12a10 10 0 0 1 0 20H41',
  x: 'M38 34l24 32M62 34 38 66',
  y: 'M38 32l12 18 12-18M50 50v18',
};

export function Shape({ kind, className, style }: { kind: ShapeKind; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" className={`shape ${kind}${className ? ' ' + className : ''}`} style={style} aria-hidden>
      {kind === 'tile' ? (
        <rect x="14" y="14" width="72" height="72" rx="12" fill="none" stroke="currentColor" strokeWidth="6" />
      ) : kind === 'ring' ? (
        <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="6" />
      ) : (
        <>
          <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="5" />
          <path d={LETTER[kind]} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

// A loose field of big outlines that float slowly, for the landing page's hero. Positions are fixed so the server and
// browser draw the same thing.
const FIELD: [ShapeKind, number, number, number, number, number][] = [
  // kind, left %, top %, size px, rotation deg, delay s
  ['tile', 8, 12, 150, -8, 0],
  ['a', 54, 4, 170, 0, 1.2],
  ['tile', 66, 50, 140, 12, 0.6],
  ['y', 16, 58, 120, -6, 1.8],
  ['ring', 4, 78, 60, 0, 2.4],
  ['x', 40, 40, 64, 0, 3],
  ['b', 86, 20, 70, 6, 1.5],
  ['tile', 84, 78, 52, -12, 2.1],
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
