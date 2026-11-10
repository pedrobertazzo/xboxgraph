import { cardResponse } from '@/lib/card';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return cardResponse(req, decodeURIComponent((await params).id));
}
