import { sendQuoteRecapEmail, type QuoteRecapRow } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { formatCents } from '@/lib/utils';

// Bounds how many not-yet-recapped expired requests one cron run inspects —
// consistent with the bounded batches used elsewhere in this cron (see
// check-stale-bids) rather than an unbounded scan.
const BATCH_LIMIT = 200;

export function formatResponseTime(ms: number): string {
  const hours = ms / (1000 * 60 * 60);
  if (hours < 1) return `${Math.max(1, Math.round(ms / 60000))}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const remainderHours = Math.round(hours % 24);
  return remainderHours > 0 ? `${days}d ${remainderHours}h` : `${days}d`;
}

// Highest-rated pro first; ties (including pros with no ratings yet) broken
// by whoever responded fastest — rewards responsive pros without letting a
// slow high-rating pro bury a faster, equally-rated one.
export function compareRecapRows(a: QuoteRecapRow, b: QuoteRecapRow): number {
  return b.avgRating !== a.avgRating ? b.avgRating - a.avgRating : a.responseTimeMs - b.responseTimeMs;
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildCsv(rows: QuoteRecapRow[]): string {
  const header = ['Trade', 'Company', 'Quote', 'Rating', 'Response time', 'Email', 'Phone'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.categoryName,
        r.businessName,
        formatCents(r.priceCents) + (r.isEstimate ? ' (est.)' : ''),
        r.avgRating > 0 ? `${r.avgRating.toFixed(1)} (${r.reviewCount} reviews)` : 'No ratings yet',
        r.responseTimeLabel,
        r.email,
        r.phone ?? '',
      ]
        .map((v) => csvEscape(String(v)))
        .join(','),
    );
  }
  return lines.join('\n');
}

/**
 * Once every request tied to a property has closed out (booked, cancelled,
 * or expired) with no sibling still open/quoted, sends the property's
 * owner (and any ccEmails) ONE consolidated recap of every quote that came
 * in on the now-expired requests — an agent who uploaded a multi-item
 * inspection report gets a single document instead of one email per item.
 * Quotes are listed highest-rated, fastest-responding pro first, as both
 * an HTML table and an attached CSV.
 *
 * Tracked per request (quoteRecapSentAt), not per property, so a later
 * batch of requests on the same address still gets its own recap.
 */
export async function sendQuoteRecaps(): Promise<number> {
  const pendingExpired = await prisma.serviceRequest.findMany({
    where: { status: 'EXPIRED', quoteRecapSentAt: null },
    select: { id: true, propertyId: true },
    take: BATCH_LIMIT,
  });
  if (pendingExpired.length === 0) return 0;

  const propertyIds = [...new Set(pendingExpired.map((r) => r.propertyId))];
  let sentCount = 0;

  for (const propertyId of propertyIds) {
    const openSiblingCount = await prisma.serviceRequest.count({
      where: { propertyId, status: { in: ['OPEN', 'QUOTED'] } },
    });
    if (openSiblingCount > 0) continue; // still waiting on the rest of this batch to resolve

    const idsForProperty = pendingExpired.filter((r) => r.propertyId === propertyId).map((r) => r.id);

    const expiredRequests = await prisma.serviceRequest.findMany({
      where: { id: { in: idsForProperty } },
      include: {
        category: true,
        property: { include: { owner: true } },
        quotes: { include: { proProfile: { include: { user: true } } } },
      },
    });

    // Marked processed regardless of whether there's anything to email —
    // zero quotes means nothing worth recapping, but these requests should
    // never be reconsidered on a later run.
    await prisma.serviceRequest.updateMany({
      where: { id: { in: idsForProperty } },
      data: { quoteRecapSentAt: new Date() },
    });

    const rows: QuoteRecapRow[] = [];
    for (const request of expiredRequests) {
      for (const quote of request.quotes) {
        if (quote.status === 'WITHDRAWN') continue;
        const responseTimeMs = quote.createdAt.getTime() - request.createdAt.getTime();
        rows.push({
          categoryName: request.category.name,
          businessName: quote.proProfile.businessName,
          priceCents: quote.priceCents,
          isEstimate: quote.isEstimate,
          avgRating: quote.proProfile.avgRating,
          reviewCount: quote.proProfile.reviewCount,
          email: quote.proProfile.user.email,
          phone: quote.proProfile.user.phone,
          responseTimeMs,
          responseTimeLabel: formatResponseTime(responseTimeMs),
        });
      }
    }
    if (rows.length === 0) continue;

    rows.sort(compareRecapRows);

    const property = expiredRequests[0].property;
    const address = [property.addressLine1, property.city, property.state, property.zip].filter(Boolean).join(', ');
    const ccEmails = [...new Set(expiredRequests.flatMap((r) => r.ccEmails))];
    const recipients = [...new Set([property.owner.email, ...ccEmails])];
    const csv = buildCsv(rows);

    await Promise.all(recipients.map((to) => sendQuoteRecapEmail({ to, address, rows, csv })));
    sentCount += 1;
  }

  return sentCount;
}
