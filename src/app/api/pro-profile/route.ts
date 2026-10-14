import { getServerSession } from 'next-auth';
import { after, NextResponse } from 'next/server';
import { z } from 'zod';

import { isOwnBlobUrl } from '@/lib/attachments';
import { authOptions } from '@/lib/auth';
import { sendNewProPendingEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  businessName: z.string().min(1),
  bio: z.string().min(1),
  yearsExperience: z.number().int().nonnegative(),
  hourlyRateCents: z.number().int().positive().nullable().optional(),
  serviceZip: z.string().min(1),
  serviceRadiusMiles: z.number().int().positive(),
  categoryIds: z.array(z.string()).min(1),
  photoUrl: z.string().url().refine(isOwnBlobUrl, 'Must be an uploaded file.').nullable().optional(),
  licenseNumber: z.string().max(100).nullable().optional(),
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

  // Mirrors the client-side check in ProProfileForm — enforced here too so
  // the requirement can't be skipped by calling the API directly.
  const selectedCategories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { licenseRequired: true },
  });
  const requiresLicense = selectedCategories.some((c) => c.licenseRequired);
  if (requiresLicense && (profileData.licenseDocumentUrls ?? []).length === 0) {
    return NextResponse.json(
      { error: 'License documentation is required for at least one of your selected categories.' },
      { status: 400 },
    );
  }

  const existingProfile = await prisma.proProfile.findUnique({ where: { userId: session.user.id } });

  const profile = await prisma.proProfile.upsert({
    where: { userId: session.user.id },
    update: profileData,
    create: { ...profileData, userId: session.user.id },
  });

  await prisma.proProfileCategory.deleteMany({ where: { proProfileId: profile.id } });
  await prisma.proProfileCategory.createMany({
    data: categoryIds.map((categoryId) => ({ proProfileId: profile.id, categoryId })),
  });

  if (!existingProfile) {
    after(async () => {
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { email: true } });
      await Promise.all(
        admins.map((admin) => sendNewProPendingEmail({ to: admin.email, businessName: profile.businessName })),
      );
    });
  }

  return NextResponse.json({ id: profile.id });
}
