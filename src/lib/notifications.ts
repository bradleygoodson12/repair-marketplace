import { sendNewLeadEmail, sendNewLeadsBatchEmail } from '@/lib/email';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';
import { zipDistanceMiles } from '@/lib/zip';

/**
 * Emails every verified pro whose categories and service radius match a
 * newly created request. Leads are free to view for every verified pro
 * regardless of billing mode — a pay-per-quote pro only pays when they
 * actually submit a quote — so there's no billing-status filter here.
 * Best-effort: failures are logged (by sendNewLeadEmail) but never thrown,
 * so a bad email never breaks request creation — call this from `after()`,
 * not inline.
 */
export async function notifyMatchingPros(requestId: string) {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    include: { category: true, property: true },
  });
  if (!request) return;

  const candidates = await prisma.proProfileCategory.findMany({
    where: {
      categoryId: request.categoryId,
      proProfile: { verified: true, user: { suspended: false } },
    },
    include: { proProfile: { include: { user: true } } },
  });

  const matching = candidates.filter(({ proProfile }) => {
    const distance = zipDistanceMiles(proProfile.serviceZip, request.property.zip);
    return distance === null || distance <= proProfile.serviceRadiusMiles;
  });

  await Promise.all(
    matching.map(({ proProfile }) =>
      sendNewLeadEmail({
        to: proProfile.user.email,
        businessName: proProfile.businessName,
        requestTitle: request.title,
        categoryName: request.category.name,
        city: request.property.city,
        state: request.property.state,
        requestId: request.id,
      }),
    ),
  );

  await Promise.all(
    matching.map(({ proProfile }) =>
      notify({
        userId: proProfile.userId,
        type: 'NEW_LEAD',
        title: `New lead: ${request.category.name} in ${request.property.city}`,
        body: request.title,
        url: `/requests/${request.id}`,
      }),
    ),
  );
}

/**
 * Same idea as notifyMatchingPros, but for a batch of requests created
 * together from one repair-document upload (one property, several line
 * items at once) — a pro matching several of them gets ONE combined email
 * and ONE in-app notification for the batch, not one per line item.
 */
export async function notifyMatchingProsForRequests(requestIds: string[]) {
  if (requestIds.length === 0) return;

  const requests = await prisma.serviceRequest.findMany({
    where: { id: { in: requestIds } },
    include: { category: true, property: true },
  });
  if (requests.length === 0) return;

  // Every request in a batch from the same upload shares one property, but
  // this doesn't assume that — it just groups whatever's actually matched.
  const matchedByProId = new Map<
    string,
    { proProfile: { id: string; userId: string; businessName: string; user: { email: string } }; items: { title: string; categoryName: string }[] }
  >();

  for (const request of requests) {
    const candidates = await prisma.proProfileCategory.findMany({
      where: {
        categoryId: request.categoryId,
        proProfile: { verified: true, user: { suspended: false } },
      },
      include: { proProfile: { include: { user: true } } },
    });

    for (const { proProfile } of candidates) {
      const distance = zipDistanceMiles(proProfile.serviceZip, request.property.zip);
      if (distance !== null && distance > proProfile.serviceRadiusMiles) continue;

      const existing = matchedByProId.get(proProfile.id);
      const item = { title: request.title, categoryName: request.category.name };
      if (existing) {
        existing.items.push(item);
      } else {
        matchedByProId.set(proProfile.id, { proProfile, items: [item] });
      }
    }
  }

  const city = requests[0].property.city;
  const state = requests[0].property.state;

  await Promise.all(
    [...matchedByProId.values()].map(({ proProfile, items }) =>
      sendNewLeadsBatchEmail({ to: proProfile.user.email, businessName: proProfile.businessName, items, city, state }),
    ),
  );

  await Promise.all(
    [...matchedByProId.values()].map(({ proProfile, items }) =>
      notify({
        userId: proProfile.userId,
        type: 'NEW_LEAD',
        title: `${items.length} new lead${items.length === 1 ? '' : 's'} in ${city}, ${state}`,
        body: items.map((i) => i.title).join(', '),
        url: '/dashboard/pro',
      }),
    ),
  );
}
