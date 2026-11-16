import { getServerSession } from 'next-auth';
import { after, NextResponse } from 'next/server';
import { z } from 'zod';

import { isOwnBlobUrl } from '@/lib/attachments';
import { authOptions } from '@/lib/auth';
import { deriveServiceLocation, hasOpenCapacity, offerNextWaitlistSpot } from '@/lib/capacity';
import { sendNewProPendingEmail, sendProWelcomeEmail, sendWaitlistJoinedEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { QUOTE_PRICE_CENTS, SUBSCRIPTION_PRICE_CENTS } from '@/lib/pricing';

const schema = z.object({
  businessName: z.string().min(1),
  bio: z.string().min(1),
  yearsExperience: z.number().int().nonnegative(),
  hourlyRateCents: z.number().int().positive().nullable().optional(),
  serviceZip: z.string().min(1),
  serviceRadiusMiles: z.number().int().positive(),
  // A pro can legitimately end up with zero active categories if every
  // trade they want is at capacity in their city — they're expected to join
  // the waitlist for those instead (see /api/pro-profile/waitlist).
  categoryIds: z.array(z.string()),
  photoUrl: z.string().url().refine(isOwnBlobUrl, 'Must be an uploaded file.').nullable().optional(),
  licenseNumber: z.string().max(100).nullable().optional(),
  isLicensed: z.boolean().optional(),
  isInsured: z.boolean().optional(),
  licenseDocumentUrls: z.array(z.string().url().refine(isOwnBlobUrl, 'Must be an uploaded file.')).max(5).optional(),
  portfolioUrls: z.array(z.string().url().refine(isOwnBlobUrl, 'Must be an uploaded file.')).max(12).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PRO') {
    return NextResponse.json({ error: 'Only pro accounts can create a pro profile.' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { categoryIds, ...profileData } = parsed.data;

  const existingProfile = await prisma.proProfile.findUnique({
    where: { userId: session.user.id },
    include: { categories: true },
  });
  const oldCategoryIds = existingProfile?.categories.map((c) => c.categoryId) ?? [];
  const oldCity = existingProfile?.serviceCity ?? null;
  const oldState = existingProfile?.serviceState ?? null;

  const location = deriveServiceLocation(profileData.serviceZip);
  if (!location) {
    return NextResponse.json({ error: 'That zip code was not recognized.' }, { status: 400 });
  }

  // Capacity is only checked for categories genuinely new to this pro — an
  // existing category they already hold is never re-checked, even if a zip
  // change moves them to a different (possibly full) city. The cap limits
  // who can newly join a full trade in a city; it doesn't evict pros
  // already practicing there.
  const addedCategoryIds = categoryIds.filter((id) => !oldCategoryIds.includes(id));
  const removedCategoryIds = oldCategoryIds.filter((id) => !categoryIds.includes(id));

  // A category the picker showed as open can still fill between page load
  // and submit (or never got checked at all, on first-time signup before
  // any profile/city exists yet). Rather than reject the save outright —
  // which would leave a brand-new pro stuck with no profile to even attach
  // a waitlist entry to — fill what's open and waitlist the rest instead.
  const fullCategoryIds: string[] = [];
  for (const categoryId of addedCategoryIds) {
    const open = await hasOpenCapacity(categoryId, location.city, location.state);
    if (!open) fullCategoryIds.push(categoryId);
  }
  const finalCategoryIds = categoryIds.filter((id) => !fullCategoryIds.includes(id));

  const profile = await prisma.proProfile.upsert({
    where: { userId: session.user.id },
    update: { ...profileData, serviceCity: location.city, serviceState: location.state },
    create: { ...profileData, serviceCity: location.city, serviceState: location.state, userId: session.user.id },
  });

  await prisma.proProfileCategory.deleteMany({ where: { proProfileId: profile.id } });
  await prisma.proProfileCategory.createMany({
    data: finalCategoryIds.map((categoryId) => ({ proProfileId: profile.id, categoryId })),
  });

  let waitlistedCategoryNames: string[] = [];
  if (fullCategoryIds.length > 0) {
    const fullCategories = await prisma.category.findMany({ where: { id: { in: fullCategoryIds } } });
    waitlistedCategoryNames = fullCategories.map((c) => c.name);
    await Promise.all(
      fullCategories.map((category) =>
        prisma.categoryWaitlistEntry.upsert({
          where: {
            proProfileId_categoryId_city_state: {
              proProfileId: profile.id,
              categoryId: category.id,
              city: location.city,
              state: location.state,
            },
          },
          update: {},
          create: { proProfileId: profile.id, categoryId: category.id, city: location.city, state: location.state },
        }),
      ),
    );
    if (session.user.email) {
      after(() =>
        Promise.all(
          fullCategories.map((category) =>
            sendWaitlistJoinedEmail({
              to: session.user.email!,
              categoryName: category.name,
              city: location.city,
              state: location.state,
            }),
          ),
        ),
      );
    }
  }

  // Dropping a category (or being verified/suspended elsewhere) can free a
  // slot someone's been waiting on.
  if (removedCategoryIds.length > 0 && oldCity && oldState) {
    after(() => Promise.all(removedCategoryIds.map((categoryId) => offerNextWaitlistSpot(categoryId, oldCity, oldState))));
  }

  if (!existingProfile) {
    after(async () => {
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { email: true } });
      await Promise.all(
        admins.map((admin) => sendNewProPendingEmail({ to: admin.email, businessName: profile.businessName })),
      );
    });
    if (session.user.email) {
      after(() =>
        sendProWelcomeEmail({
          to: session.user.email!,
          businessName: profile.businessName,
          quotePriceDollars: QUOTE_PRICE_CENTS / 100,
          subscriptionPriceDollars: SUBSCRIPTION_PRICE_CENTS / 100,
        }),
      );
    }
  }

  return NextResponse.json({ id: profile.id, waitlistedCategoryNames });
}
