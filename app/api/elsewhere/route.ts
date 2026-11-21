import { NextResponse, type NextRequest } from 'next/server';
import { elsewhere, validName } from '@/lib/elsewhere';
import { isOptedOut } from '@/lib/optout';

// The same name on the sister sites (lib/elsewhere.ts), for the "also on" line under a profile. Asked by the page
// after it has loaded, so it never slows the dashboard down.
export async function GET(req: NextRequest) {
  const name = (req.nextUrl.searchParams.get('name') ?? '').trim();
  const matches = validName(name) && !isOptedOut(name) ? await elsewhere(name) : [];
  return NextResponse.json({ matches }, { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } });
}
