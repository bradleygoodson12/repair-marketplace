import { getServerSession } from 'next-auth';
import { after, NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { hasOpenCapacity } from '@/lib/capacity';
import { sendWaitlistJoinedEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';

const schema = z.object({ categoryId: z.string().min(1) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PRO') {
    return NextResponse.json({ error: 'Only pros can join a category waitlist.' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const proProfile = await prisma.proProfile.findUnique({
    where: { userId: session.user.id },
    include: { categories: true },
  });
  if (!proProfile) {
    return NextResponse.json({ error: 'Complete your pro profile first.' }, { status: 403 });
  }
  if (!proProfile.serviceCity || !proProfile.serviceState) {
    return NextResponse.json({ error: 'Save your service zip code before joining a waitlist.' }, { status: 400 });
  }
  if (proProfile.categories.some((c) => c.categoryId === parsed.data.categoryId)) {
    return NextResponse.json({ error: 'You already have this category.' }, { status: 409 });
  }

  const open = await hasOpenCapacity(parsed.data.categoryId, proProfile.serviceCity, proProfile.serviceState);
  if (open) {
    return NextResponse.json({ error: 'This category has open spots — just select it, no need to wait.' }, { status: 409 });
  }

  const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
  if (!category) return NextResponse.json({ error: 'Category not found.' }, { status: 404 });

  const entry = await prisma.categoryWaitlistEntry.upsert({
    where: {
      proProfileId_categoryId_city_state: {
        proProfileId: proProfile.id,
        categoryId: category.id,
        city: proProfile.serviceCity,
        state: proProfile.serviceState,
      },
    },
    update: {},
    create: {
      proProfileId: proProfile.id,
      categoryId: category.id,
      city: proProfile.serviceCity,
      state: proProfile.serviceState,
    },
  });

  if (session.user.email) {
    after(() =>
      sendWaitlistJoinedEmail({
        to: session.user.email!,
        categoryName: category.name,
        city: proProfile.serviceCity!,
        state: proProfile.serviceState!,
      }),
    );
  }

  return NextResponse.json({ id: entry.id, status: entry.status });
}
