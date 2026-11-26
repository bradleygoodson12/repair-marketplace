import { NextResponse } from 'next/server';

import { sendAppointmentReminders } from '@/lib/appointment-reminders';
import {
  sendProHighDeclineRateAlertEmail,
  sendProLowRatingAlertEmail,
  sendProNotBiddingAlertEmail,
} from '@/lib/email';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';
import { expireStaleRequests, sendExpiryReminders } from '@/lib/request-expiry';
import { zipDistanceMiles } from '@/lib/zip';

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
const CONSECUTIVE_MISS_THRESHOLD = 5;
const RE_ALERT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const LOOKBACK_DAYS = 14;

// A pro needs at least this many reviews before a bad ratio means anything —
// below this, one unhappy customer could swing the percentage wildly.
const MIN_REVIEWS_FOR_QUALITY_CHECK = 3;
// 2 stars or below counts as "bad" for the ratio below.
const BAD_REVIEW_MAX_RATING = 2;
const BAD_REVIEW_RATIO_THRESHOLD = 0.3;

// Same reasoning as MIN_REVIEWS_FOR_QUALITY_CHECK, applied to declined leads:
// a pro needs a real sample of matched leads before a decline rate means
// anything, so a single slow week with 1-2 matches can't trigger this.
const DECLINE_RATE_SAMPLE_SIZE = 10;
const MIN_MATCHED_FOR_DECLINE_CHECK = 5;
const DECLINE_RATE_THRESHOLD = 0.5;

function inCooldown(lastAlertAt: Date | null) {
  return !!lastAlertAt && Date.now() - lastAlertAt.getTime() < RE_ALERT_COOLDOWN_MS;
}

// Daily check (see vercel.json) for verified-pro quality concerns worth an
// admin's attention. Three independent signals, each with its own 7-day
// re-alert cooldown so flagging one doesn't silence the others:
//   1. Not bidding — a matching lead sitting unquoted past 48h, or none of
//      their last 5 matched leads quoted at all.
//   2. Bad reviews — 30%+ of their reviews at 2 stars or below (min 3
//      reviews, so one unhappy customer can't trigger it alone).
//   3. High decline rate — 50%+ of their last 10 matched leads actively
//      dismissed from their dashboard instead of quoted (min 5 matched
//      leads in the sample).
// "Matched" is re-derived the same way notifyMatchingPros does (category +
// verified + service radius) rather than keeping a separate log table, and
// is shared between signals 1 and 3 since both need the same set.
// Also sends upcoming-appointment reminders (see lib/appointment-reminders)
// and handles the 48h-unquoted pro reminder / 72h request expiry (see
// lib/request-expiry) — all folded into this same daily run rather than
// their own Vercel Cron entries, since the Hobby plan caps both cron
// frequency *and* cron count (already at 2 with this one and
// check-waitlist-expiry).
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
    const categoryIds = pro.categories.map((c) => c.categoryId);

    let matched: Awaited<ReturnType<typeof prisma.serviceRequest.findMany<{ include: { property: true } }>>> = [];
    let quotedRequestIds = new Set<string>();
    if (categoryIds.length > 0) {
      const candidates = await prisma.serviceRequest.findMany({
        where: { categoryId: { in: categoryIds }, createdAt: { gte: lookbackSince } },
        include: { property: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      matched = candidates.filter((r) => {
        const distance = zipDistanceMiles(pro.serviceZip, r.property.zip);
        return distance === null || distance <= pro.serviceRadiusMiles;
      });
      quotedRequestIds = new Set(
        (await prisma.quote.findMany({ where: { proProfileId: pro.id }, select: { requestId: true } })).map(
          (q) => q.requestId,
        ),
      );
    }

    // --- Signal 1: not bidding on matching leads ---
    if (matched.length > 0 && !inCooldown(pro.lastBiddingAlertAt)) {
      const unbidPast48h = matched.filter(
        (r) =>
          (r.status === 'OPEN' || r.status === 'QUOTED') &&
          Date.now() - r.createdAt.getTime() >= FORTY_EIGHT_HOURS_MS &&
          !quotedRequestIds.has(r.id),
      );

      const last5 = matched.slice(0, CONSECUTIVE_MISS_THRESHOLD);
      const missedLast5 =
        last5.length === CONSECUTIVE_MISS_THRESHOLD && last5.every((r) => !quotedRequestIds.has(r.id));

      if (unbidPast48h.length > 0 || missedLast5) {
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
          admins.map((admin) =>
            sendProNotBiddingAlertEmail({ to: admin.email, businessName: pro.businessName, reason }),
          ),
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
    }

    // --- Signal 2: a high share of bad reviews ---
    if (pro.reviewCount >= MIN_REVIEWS_FOR_QUALITY_CHECK && !inCooldown(pro.lastReviewQualityAlertAt)) {
      const badReviewCount = await prisma.review.count({
        where: { proProfileId: pro.id, rating: { lte: BAD_REVIEW_MAX_RATING } },
      });
      const badReviewRatio = badReviewCount / pro.reviewCount;

      if (badReviewRatio >= BAD_REVIEW_RATIO_THRESHOLD) {
        await Promise.all(
          admins.map((admin) =>
            sendProLowRatingAlertEmail({
              to: admin.email,
              businessName: pro.businessName,
              badReviewCount,
              reviewCount: pro.reviewCount,
            }),
          ),
        );
        await Promise.all(
          admins.map((admin) =>
            notify({
              userId: admin.id,
              type: 'PRO_LOW_RATING',
              title: `${pro.businessName} has ${badReviewCount} of ${pro.reviewCount} reviews at 2 stars or below`,
              url: '/admin/pros',
            }),
          ),
        );
        await prisma.proProfile.update({ where: { id: pro.id }, data: { lastReviewQualityAlertAt: new Date() } });
        flaggedCount += 1;
      }
    }

    // --- Signal 3: consistently declining matched leads instead of quoting ---
    if (matched.length >= MIN_MATCHED_FOR_DECLINE_CHECK && !inCooldown(pro.lastDeclineRateAlertAt)) {
      const sample = matched.slice(0, DECLINE_RATE_SAMPLE_SIZE);
      const declinedCount = await prisma.proLeadDismissal.count({
        where: { proProfileId: pro.id, serviceRequestId: { in: sample.map((r) => r.id) } },
      });
      const declineRate = declinedCount / sample.length;

      if (declineRate >= DECLINE_RATE_THRESHOLD) {
        await Promise.all(
          admins.map((admin) =>
            sendProHighDeclineRateAlertEmail({
              to: admin.email,
              businessName: pro.businessName,
              declinedCount,
              sampleSize: sample.length,
            }),
          ),
        );
        await Promise.all(
          admins.map((admin) =>
            notify({
              userId: admin.id,
              type: 'PRO_HIGH_DECLINE_RATE',
              title: `${pro.businessName} declined ${declinedCount} of their last ${sample.length} matched leads`,
              url: '/admin/pros',
            }),
          ),
        );
        await prisma.proProfile.update({ where: { id: pro.id }, data: { lastDeclineRateAlertAt: new Date() } });
        flaggedCount += 1;
      }
    }
  }

  const remindersSent = await sendAppointmentReminders();
  const expiryRemindersSent = await sendExpiryReminders();
  const expired = await expireStaleRequests();

  return NextResponse.json({
    checked: pros.length,
    flagged: flaggedCount,
    remindersSent,
    expiryRemindersSent,
    expired,
  });
}
