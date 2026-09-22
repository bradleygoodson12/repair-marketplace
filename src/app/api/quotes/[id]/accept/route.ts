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

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { request: true },
  });

  if (!quote) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 });
  if (quote.request.customerId !== session.user.id) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }
  if (quote.request.status === 'BOOKED' || quote.request.status === 'IN_PROGRESS' || quote.request.status === 'COMPLETED') {
    return NextResponse.json({ error: 'This request already has a booking.' }, { status: 409 });
  }

  const booking = await prisma.$transaction(async (tx) => {
    await tx.quote.update({ where: { id: quote.id }, data: { status: 'ACCEPTED' } });
    await tx.quote.updateMany({
      where: { requestId: quote.requestId, id: { not: quote.id } },
      data: { status: 'DECLINED' },
    });
    await tx.serviceRequest.update({ where: { id: quote.requestId }, data: { status: 'BOOKED' } });

    return tx.booking.create({
      data: {
        requestId: quote.requestId,
        quoteId: quote.id,
        scheduledDate: new Date(),
        totalCents: quote.priceCents,
      },
    });
  });

  return NextResponse.json({ id: booking.id });
}
