import { NextResponse } from 'next/server';

import { sendProNotBiddingAlertEmail } from '@/lib/email';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';
import { zipDistanceMiles } from '@/lib/zip';

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
const CONSECUTIVE_MISS_THRESHOLD = 5;
const RE_ALERT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const LOOKBACK_DAYS = 14;

// Daily check (see vercel.json) for verified pros who match leads but
// aren't bidding on them — flags anyone with an unbid matching lead posted
// over 48h ago, or whose last 5 matched leads got zero quotes from them.
// Re-derives "matched" the same way notifyMatchingPros does (category +
// verified + service radius) rather than keeping a separate log table.
// Vercel Cron invokes scheduled routes via GET.
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured.' }, { status: 500 });
  }
  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const pros = await prisma.proProfile.findMany({
    where: { verified: true },
    include: { user: true, categories: true },
  });

  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true, email: true } });

  const lookbackSince = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  let flaggedCount = 0;

  for (const pro of pros) {
    if (pro.lastBiddingAlertAt && Date.now() - pro.lastBiddingAlertAt.getTime() < RE_ALERT_COOLDOWN_MS) {
      continue;
    }

    const categoryIds = pro.categories.map((c) => c.categoryId);
    if (categoryIds.length === 0) continue;

    const candidates = await prisma.serviceRequest.findMany({
      where: { categoryId: { in: categoryIds }, createdAt: { gte: lookbackSince } },
      include: { property: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const matched = candidates.filter((r) => {
      const distance = zipDistanceMiles(pro.serviceZip, r.property.zip);
      return distance === null || distance <= pro.serviceRadiusMiles;
    });
    if (matched.length === 0) continue;

    const quotedRequestIds = new Set(
      (await prisma.quote.findMany({ where: { proProfileId: pro.id }, select: { requestId: true } })).map(
        (q) => q.requestId,
      ),
    );

    const unbidPast48h = matched.filter(
      (r) =>
        (r.status === 'OPEN' || r.status === 'QUOTED') &&
        Date.now() - r.createdAt.getTime() >= FORTY_EIGHT_HOURS_MS &&
        !quotedRequestIds.has(r.id),
    );

    const last5 = matched.slice(0, CONSECUTIVE_MISS_THRESHOLD);
    const missedLast5 = last5.length === CONSECUTIVE_MISS_THRESHOLD && last5.every((r) => !quotedRequestIds.has(r.id));

    if (unbidPast48h.length === 0 && !missedLast5) continue;

    const reasonParts: string[] = [];
    if (unbidPast48h.length > 0) {
      reasonParts.push(
        `hasn't bid on ${unbidPast48h.length} matching lead${unbidPast48h.length === 1 ? '' : 's'} posted over 48 hours ago`,
      );
    }
    if (missedLast5) {
      reasonParts.push(`hasn't bid on any of their last ${CONSECUTIVE_MISS_THRESHOLD} matched leads`);
    }
    const reason = reasonParts.join(' and ');

    await Promise.all(
      admins.map((admin) => sendProNotBiddingAlertEmail({ to: admin.email, businessName: pro.businessName, reason })),
    );
    await Promise.all(
      admins.map((admin) =>
        notify({
          userId: admin.id,
          type: 'PRO_NOT_BIDDING',
          title: `${pro.businessName} ${reason}`,
          url: '/admin/pros',
        }),
      ),
    );
    await prisma.proProfile.update({ where: { id: pro.id }, data: { lastBiddingAlertAt: new Date() } });
    flaggedCount += 1;
  }

  return NextResponse.json({ checked: pros.length, flagged: flaggedCount });
}
