import { getServerSession } from 'next-auth';
import { after, NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { sendBookingCancelledEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  reason: z.string().trim().max(1000).nullable().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      request: { include: { customer: true } },
      quote: { include: { proProfile: { include: { user: true } } } },
    },
  });
  if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });

  const isCustomer = booking.request.customerId === session.user.id;
  const isBookedPro = booking.quote.proProfile.userId === session.user.id;
  if (!isCustomer && !isBookedPro) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }
  if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
    return NextResponse.json({ error: 'This booking can no longer be cancelled.' }, { status: 409 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const reason = parsed.data.reason || null;
  const cancelledByRole = isCustomer ? 'CUSTOMER' : 'PRO';

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledByRole, cancelReason: reason },
    }),
    prisma.serviceRequest.update({ where: { id: booking.requestId }, data: { status: 'CANCELLED' } }),
  ]);

  after(() =>
    sendBookingCancelledEmail({
      to: isCustomer ? booking.quote.proProfile.user.email : booking.request.customer.email,
      requestTitle: booking.request.title,
      cancelledByLabel: isCustomer ? 'The customer' : booking.quote.proProfile.businessName,
      reason,
      requestId: booking.requestId,
    }),
  );

  return NextResponse.json({ ok: true });
}
