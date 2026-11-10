import { NextResponse, type NextRequest } from 'next/server';
import { inputProblem, parseGamertag } from '@/lib/xbox';
import { profilePath } from '@/lib/types';

// Search input to a profile page. Nothing is looked up here: the profile page says if the player doesn't exist.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const id = parseGamertag(q);
  if (!id) {
    const back = new URL('/', req.url);
    back.search = new URLSearchParams({ error: inputProblem(q), q }).toString();
    return NextResponse.redirect(back);
  }
  return NextResponse.redirect(new URL(profilePath({ id }), req.url));
}
