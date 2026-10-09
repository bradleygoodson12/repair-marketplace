import { sendNewLeadEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { zipDistanceMiles } from '@/lib/zip';

/**
 * Emails every actively-subscribed pro whose categories and service radius
 * match a newly created request. Only subscribed pros can see/quote leads
 * at all, so unsubscribed pros are never notified. Best-effort: failures
 * are logged (by sendNewLeadEmail) but never thrown, so a bad email never
 * breaks request creation — call this from `after()`, not inline.
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
      proProfile: { subscriptionStatus: 'ACTIVE' },
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
}
