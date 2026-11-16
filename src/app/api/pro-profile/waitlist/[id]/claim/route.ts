import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { hasOpenCapacity } from '@/lib/capacity';
import { prisma } from '@/lib/prisma';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PRO') {
    return NextResponse.json({ error: 'Only pros can claim a waitlist spot.' }, { status: 403 });
  }

  const proProfile = await prisma.proProfile.findUnique({ where: { userId: session.user.id } });
  if (!proProfile) return NextResponse.json({ error: 'Complete your pro profile first.' }, { status: 403 });

  const entry = await prisma.categoryWaitlistEntry.findUnique({ where: { id } });
  if (!entry || entry.proProfileId !== proProfile.id) {
    return NextResponse.json({ error: 'Waitlist entry not found.' }, { status: 404 });
  }
  if (entry.status !== 'OFFERED') {
    return NextResponse.json({ error: 'This offer is no longer available.' }, { status: 409 });
  }
  if (!entry.offerExpiresAt || entry.offerExpiresAt < new Date()) {
    return NextResponse.json({ error: 'This offer has expired.' }, { status: 409 });
  }

  // Re-check capacity at claim time — a race is unlikely (only one entry is
  // ever OFFERED per category+city at a time) but cheap to guard anyway.
  const open = await hasOpenCapacity(entry.categoryId, entry.city, entry.state);
  if (!open) {
    return NextResponse.json({ error: 'That spot was just taken. You stay first in line for the next one.' }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.categoryWaitlistEntry.update({ where: { id: entry.id }, data: { status: 'CLAIMED' } }),
    prisma.proProfileCategory.upsert({
      where: { proProfileId_categoryId: { proProfileId: proProfile.id, categoryId: entry.categoryId } },
      update: {},
      create: { proProfileId: proProfile.id, categoryId: entry.categoryId },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
