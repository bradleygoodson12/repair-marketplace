import zipcodes from 'zipcodes';

import { sendWaitlistJoinedEmail, sendWaitlistSpotOfferedEmail } from '@/lib/email';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';

// Each category is capped at this many active (verified, non-suspended)
// pros per city — a deliberate supply limit to keep the platform
// high-quality rather than flooding customers with dozens of competing
// quotes. Scoped to city rather than globally or by zip: granular enough to
// mean something ("5 plumbers in Charleston"), without the overlapping-radius
// math a zip-based cap would need.
export const CATEGORY_CAPACITY_PER_CITY = 5;

// How long an offered waitlist spot stays claimable before it's passed to
// the next person in line (see api/cron/check-waitlist-expiry).
export const WAITLIST_OFFER_WINDOW_MS = 48 * 60 * 60 * 1000;

export function deriveServiceLocation(zip: string): { city: string; state: string } | null {
  const info = zipcodes.lookup(zip);
  if (!info) return null;
  return { city: info.city, state: info.state };
}

/** Count of currently-active (verified, non-suspended) pros holding this category in this city. */
export async function countActiveOccupants(categoryId: string, city: string, state: string): Promise<number> {
  return prisma.proProfileCategory.count({
    where: {
      categoryId,
      proProfile: { serviceCity: city, serviceState: state, verified: true, user: { suspended: false } },
    },
  });
}

export async function hasOpenCapacity(categoryId: string, city: string, state: string): Promise<boolean> {
  const count = await countActiveOccupants(categoryId, city, state);
  return count < CATEGORY_CAPACITY_PER_CITY;
}

/** One grouped query instead of one-per-category — for rendering a full category picker. */
export async function getFullCategoryIds(city: string, state: string): Promise<Set<string>> {
  const counts = await prisma.proProfileCategory.groupBy({
    by: ['categoryId'],
    where: { proProfile: { serviceCity: city, serviceState: state, verified: true, user: { suspended: false } } },
    _count: true,
  });
  return new Set(counts.filter((c) => c._count >= CATEGORY_CAPACITY_PER_CITY).map((c) => c.categoryId));
}

/**
 * Call this whenever a pro vacates a category+city slot (drops the
 * category, gets suspended, or loses verification) — offers the spot to
 * the oldest still-WAITING entry, if any. Best-effort, same spirit as
 * notify(): a failure here shouldn't break the action that freed the slot.
 */
export async function offerNextWaitlistSpot(categoryId: string, city: string, state: string): Promise<void> {
  try {
    const stillOpen = await hasOpenCapacity(categoryId, city, state);
    if (!stillOpen) return;

    const next = await prisma.categoryWaitlistEntry.findFirst({
      where: { categoryId, city, state, status: 'WAITING' },
      orderBy: { createdAt: 'asc' },
      include: { proProfile: { include: { user: true } }, category: true },
    });
    if (!next) return;

    const offerExpiresAt = new Date(Date.now() + WAITLIST_OFFER_WINDOW_MS);
    await prisma.categoryWaitlistEntry.update({
      where: { id: next.id },
      data: { status: 'OFFERED', offeredAt: new Date(), offerExpiresAt },
    });

    await sendWaitlistSpotOfferedEmail({
      to: next.proProfile.user.email,
      businessName: next.proProfile.businessName,
      categoryName: next.category.name,
      city,
      state,
      expiresAt: offerExpiresAt,
    });
    await notify({
      userId: next.proProfile.userId,
      type: 'WAITLIST_SPOT_OFFERED',
      title: `A ${next.category.name} spot opened up in ${city}, ${state}`,
      body: 'Claim it from your dashboard before the offer expires.',
      url: '/dashboard/pro',
    });
  } catch (error) {
    console.error('Failed to offer next waitlist spot', error);
  }
}

/**
 * Call this whenever a pro's categories go from not counting against the
 * cap to counting again (admin verifies them, or un-suspends them).
 * Capacity checks elsewhere only count already-active pros, so while this
 * pro was unverified/suspended, other pros could legitimately fill up a
 * category they already hold — this re-checks each one now that it counts
 * for real, and bumps any that are over cap back to the waitlist instead of
 * silently letting the cap run over. Best-effort, same spirit as
 * offerNextWaitlistSpot: a failure here shouldn't break the activation.
 */
export async function reconcileCapacityAfterActivation(
  proProfileId: string,
  city: string,
  state: string,
  categoryIds: string[],
): Promise<void> {
  try {
    const overflowCategoryIds: string[] = [];
    for (const categoryId of categoryIds) {
      const count = await countActiveOccupants(categoryId, city, state);
      if (count > CATEGORY_CAPACITY_PER_CITY) overflowCategoryIds.push(categoryId);
    }
    if (overflowCategoryIds.length === 0) return;

    await prisma.proProfileCategory.deleteMany({
      where: { proProfileId, categoryId: { in: overflowCategoryIds } },
    });
    await Promise.all(
      overflowCategoryIds.map((categoryId) =>
        prisma.categoryWaitlistEntry.upsert({
          where: { proProfileId_categoryId_city_state: { proProfileId, categoryId, city, state } },
          update: { status: 'WAITING', offeredAt: null, offerExpiresAt: null },
          create: { proProfileId, categoryId, city, state },
        }),
      ),
    );

    const [overflowCategories, proProfile] = await Promise.all([
      prisma.category.findMany({ where: { id: { in: overflowCategoryIds } } }),
      prisma.proProfile.findUnique({ where: { id: proProfileId }, include: { user: true } }),
    ]);
    if (proProfile?.user.email) {
      await Promise.all(
        overflowCategories.map((category) =>
          sendWaitlistJoinedEmail({ to: proProfile.user.email, categoryName: category.name, city, state }),
        ),
      );
    }
  } catch (error) {
    console.error('Failed to reconcile capacity after activation', error);
  }
}
