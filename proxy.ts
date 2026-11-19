import { NextResponse, type NextRequest } from 'next/server';

// "Name#1234" and "Name1234" are one player (see gamertagId): profile and compare links with the "#" move to the one
// URL before the page starts streaming, so the redirect is a real one and both spellings share a cache entry.
export function proxy(req: NextRequest) {
  if (!/%23|#/i.test(req.nextUrl.pathname)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = url.pathname.replace(/%23|#/gi, '');
  return NextResponse.redirect(url, 308);
}

export const config = { matcher: ['/profile/:path*', '/compare/:path*'] };
