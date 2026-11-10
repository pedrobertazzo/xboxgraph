import { NextResponse } from 'next/server';
import { budgetState } from '@/lib/xbox';
import { shared } from '@/lib/store';

// A quick health check: whether the shared cache is connected and how much of the Xbox request budget is left.
// It shows no tokens or player data.
export async function GET() {
  const b = await budgetState();
  return NextResponse.json(
    {
      source: b.source === 'openxbl' ? 'OpenXBL (xbl.io)' : 'Xbox Live, signed in directly',
      requestBudget: b.budget,
      sharedCache: shared ? 'connected (Upstash Redis)' : 'off: each server keeps its own memory cache',
      xboxRequestsLeft: Math.max(0, Math.floor(b.remaining)),
      paused: b.blocked,
      keySet: b.source === 'openxbl' || (!!process.env.XBOX_CLIENT_ID && !!process.env.XBOX_REFRESH_TOKEN),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
