import { NextResponse, type NextRequest } from 'next/server';
import { MAX_PLAYERS } from '@/lib/compare';
import { inputProblem, parseGamertag } from '@/lib/xbox';

// The compare form's gamertags or profile links to /compare/<a>/<b>…; blank boxes are skipped. The compare page's
// "Add" button sends the player it keeps as `keep`, so the new player (the last `p`) joins at the end.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const ps = sp.getAll('p');
  const keep = sp.getAll('keep');
  const raw = (keep.length ? [...ps.slice(0, -1), ...keep, ...ps.slice(-1)] : ps).map((s) => s.trim()).filter(Boolean).slice(0, MAX_PLAYERS);
  const ids: string[] = [];
  for (const r of raw) {
    const id = r.toLowerCase() === 'sample' || r.toLowerCase() === 'samplerival' ? r.toLowerCase() : parseGamertag(r);
    if (!id) {
      const back = new URL('/compare', req.url);
      back.search = new URLSearchParams([...raw.map((p) => ['p', p]), ['error', `“${r}”: ${inputProblem(r)}`]]).toString();
      return NextResponse.redirect(back);
    }
    if (!ids.includes(id)) ids.push(id);
  }
  if (ids.length < 2) {
    const back = new URL('/compare', req.url);
    back.search = new URLSearchParams([...raw.map((p) => ['p', p]), ['error', 'Add at least two different players.']]).toString();
    return NextResponse.redirect(back);
  }
  return NextResponse.redirect(new URL(`/compare/${ids.map(encodeURIComponent).join('/')}`, req.url));
}
