import { sendQuoteExpiringReminderEmail, sendRequestExpiredEmail } from '@/lib/email';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';
import { zipDistanceMiles } from '@/lib/zip';

// Both checked once daily, folded into check-stale-bids rather than a
// separate Vercel Cron entry (see that file for why) — so a request's
// actual reminder/expiry can lag its exact 48h/72h mark by up to the ~24h
// between runs, the same tradeoff already accepted for appointment
// reminders.
const REMINDER_AFTER_MS = 48 * 60 * 60 * 1000;
const EXPIRES_AFTER_MS = 72 * 60 * 60 * 1000;

// Emails every verified, matching pro who HASN'T yet quoted a request
// that's 48-72h old and still unbooked — a nudge before it closes.
// expiryReminderSentAt makes this idempotent regardless of how many times
// the cron runs inside that window.
export async function sendExpiryReminders(): Promise<number> {
  const reminderCutoff = new Date(Date.now() - REMINDER_AFTER_MS);
  const expiryCutoff = new Date(Date.now() - EXPIRES_AFTER_MS);

  const requests = await prisma.serviceRequest.findMany({
    where: {
      status: { in: ['OPEN', 'QUOTED'] },
      createdAt: { lte: reminderCutoff, gt: expiryCutoff },
      expiryReminderSentAt: null,
    },
    include: { property: true, quotes: true },
  });

  for (const request of requests) {
    const quotedProProfileIds = new Set(request.quotes.map((q) => q.proProfileId));

    const candidates = await prisma.proProfileCategory.findMany({
      where: {
        categoryId: request.categoryId,
        proProfile: { verified: true, user: { suspended: false } },
      },
      include: { proProfile: { include: { user: true } } },
    });

    const matching = candidates.filter(({ proProfile }) => {
      if (quotedProProfileIds.has(proProfile.id)) return false;
      const distance = zipDistanceMiles(proProfile.serviceZip, request.property.zip);
      return distance === null || distance <= proProfile.serviceRadiusMiles;
    });

    await Promise.all(
      matching.map(({ proProfile }) =>
        sendQuoteExpiringReminderEmail({
          to: proProfile.user.email,
          businessName: proProfile.businessName,
          requestTitle: request.title,
          requestId: request.id,
        }),
      ),
    );
    await Promise.all(
      matching.map(({ proProfile }) =>
        notify({
          userId: proProfile.userId,
          type: 'REQUEST_EXPIRING_SOON',
          title: `Expiring soon: ${request.title}`,
          url: `/requests/${request.id}`,
        }),
      ),
    );

    await prisma.serviceRequest.update({ where: { id: request.id }, data: { expiryReminderSentAt: new Date() } });
  }

  return requests.length;
}

// Closes out any request that's gone 72h with no booking — pulled off
// every pro-facing list by the status change alone (the OPEN/QUOTED filters
// already used everywhere leads and quoting are gated), while staying a
// fully intact record the customer can still see and re-submit from (see
// /api/requests/[id]/resubmit).
export async function expireStaleRequests(): Promise<number> {
  const expiryCutoff = new Date(Date.now() - EXPIRES_AFTER_MS);

  const requests = await prisma.serviceRequest.findMany({
    where: { status: { in: ['OPEN', 'QUOTED'] }, createdAt: { lte: expiryCutoff } },
    include: { customer: true },
  });

  for (const request of requests) {
    await prisma.serviceRequest.update({ where: { id: request.id }, data: { status: 'EXPIRED' } });
    await sendRequestExpiredEmail({ to: request.customer.email, requestTitle: request.title, requestId: request.id });
    await notify({
      userId: request.customerId,
      type: 'REQUEST_EXPIRED',
      title: `Expired without a hire: ${request.title}`,
      url: `/requests/${request.id}`,
    });
  }

  return requests.length;
}
