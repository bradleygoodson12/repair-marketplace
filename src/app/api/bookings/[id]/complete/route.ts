import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { request: true },
  });
  if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  if (booking.request.customerId !== session.user.id) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }
  if (booking.paymentStatus !== 'PAID') {
    return NextResponse.json({ error: 'Booking must be paid before it can be marked complete.' }, { status: 409 });
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
  await prisma.serviceRequest.update({
    where: { id: booking.requestId },
    data: { status: 'COMPLETED' },
  });

  return NextResponse.json({ ok: true });
}
