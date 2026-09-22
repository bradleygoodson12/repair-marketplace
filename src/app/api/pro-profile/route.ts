import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  businessName: z.string().min(1),
  bio: z.string().min(1),
  yearsExperience: z.number().int().nonnegative(),
  hourlyRateCents: z.number().int().positive().nullable().optional(),
  serviceZip: z.string().min(1),
  serviceRadiusMiles: z.number().int().positive(),
  categoryIds: z.array(z.string()).min(1),
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

  const profile = await prisma.proProfile.upsert({
    where: { userId: session.user.id },
    update: profileData,
    create: { ...profileData, userId: session.user.id },
  });

  await prisma.proProfileCategory.deleteMany({ where: { proProfileId: profile.id } });
  await prisma.proProfileCategory.createMany({
    data: categoryIds.map((categoryId) => ({ proProfileId: profile.id, categoryId })),
  });

  return NextResponse.json({ id: profile.id });
}
