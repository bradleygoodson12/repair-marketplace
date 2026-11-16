import { getServerSession } from 'next-auth';
import { after, NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { offerNextWaitlistSpot } from '@/lib/capacity';
import { prisma } from '@/lib/prisma';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PRO') {
    return NextResponse.json({ error: 'Only pros can decline a waitlist offer.' }, { status: 403 });
  }

  const proProfile = await prisma.proProfile.findUnique({ where: { userId: session.user.id } });
  if (!proProfile) return NextResponse.json({ error: 'Complete your pro profile first.' }, { status: 403 });

  const entry = await prisma.categoryWaitlistEntry.findUnique({ where: { id } });
  if (!entry || entry.proProfileId !== proProfile.id) {
    return NextResponse.json({ error: 'Waitlist entry not found.' }, { status: 404 });
  }
  if (entry.status !== 'OFFERED') {
    return NextResponse.json({ error: 'This offer is no longer active.' }, { status: 409 });
  }

  await prisma.categoryWaitlistEntry.update({ where: { id: entry.id }, data: { status: 'DECLINED' } });

  after(() => offerNextWaitlistSpot(entry.categoryId, entry.city, entry.state));

  return NextResponse.json({ ok: true });
}
