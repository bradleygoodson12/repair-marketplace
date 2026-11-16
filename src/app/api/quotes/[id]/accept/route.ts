import { getServerSession } from 'next-auth';
import { NextResponse, after } from 'next/server';

import { authOptions } from '@/lib/auth';
import { sendQuoteAcceptedEmail, sendQuoteNotSelectedEmail } from '@/lib/email';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { request: true, proProfile: { include: { user: true } } },
  });

  if (!quote) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 });
  if (quote.request.customerId !== session.user.id) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }
  if (quote.request.status === 'BOOKED' || quote.request.status === 'IN_PROGRESS' || quote.request.status === 'COMPLETED') {
    return NextResponse.json({ error: 'This request already has a booking.' }, { status: 409 });
  }

  // Only pending quotes are getting newly declined by this action — a quote
  // already withdrawn/declined shouldn't get a "not selected" notification
  // for something that already happened.
  const otherPendingQuotes = await prisma.quote.findMany({
    where: { requestId: quote.requestId, id: { not: quote.id }, status: 'PENDING' },
    include: { proProfile: { include: { user: true } } },
  });

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

  after(() =>
    sendQuoteAcceptedEmail({
      to: quote.proProfile.user.email,
      businessName: quote.proProfile.businessName,
      requestTitle: quote.request.title,
      customerName: session.user.name ?? 'The customer',
      requestId: quote.requestId,
    }),
  );
  after(() =>
    notify({
      userId: quote.proProfile.userId,
      type: 'QUOTE_ACCEPTED',
      title: `Your quote was accepted: ${quote.request.title}`,
      url: `/requests/${quote.requestId}`,
    }),
  );

  after(() =>
    Promise.all(
      otherPendingQuotes.map((q) =>
        sendQuoteNotSelectedEmail({
          to: q.proProfile.user.email,
          requestTitle: quote.request.title,
          requestId: quote.requestId,
        }),
      ),
    ),
  );
  after(() =>
    Promise.all(
      otherPendingQuotes.map((q) =>
        notify({
          userId: q.proProfile.userId,
          type: 'QUOTE_NOT_SELECTED',
          title: `Quote not selected: ${quote.request.title}`,
          url: `/requests/${quote.requestId}`,
        }),
      ),
    ),
  );

  return NextResponse.json({ id: booking.id });
}
