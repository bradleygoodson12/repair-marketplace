import { NextResponse } from 'next/server';

import { offerNextWaitlistSpot } from '@/lib/capacity';
import { prisma } from '@/lib/prisma';

// Runs every few hours (see vercel.json) — any OFFERED waitlist entry past
// its claim window is expired and the spot passed to the next person in
// line, so one unresponsive pro never blocks the queue indefinitely.
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured.' }, { status: 500 });
  }
  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const expired = await prisma.categoryWaitlistEntry.findMany({
    where: { status: 'OFFERED', offerExpiresAt: { lt: new Date() } },
  });

  for (const entry of expired) {
    await prisma.categoryWaitlistEntry.update({ where: { id: entry.id }, data: { status: 'EXPIRED' } });
    await offerNextWaitlistSpot(entry.categoryId, entry.city, entry.state);
  }

  return NextResponse.json({ expired: expired.length });
}
