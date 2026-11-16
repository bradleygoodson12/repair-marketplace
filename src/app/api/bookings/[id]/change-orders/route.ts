import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { createChangeOrderFeeCheckoutSession, notifyChangeOrderLive } from '@/lib/change-order-fee';
import { prisma } from '@/lib/prisma';
import { QUOTE_PRICE_CENTS } from '@/lib/pricing';
import { getOrCreateStripeCustomerId } from '@/lib/stripe-customer';

const schema = z.object({
  description: z.string().min(1),
  additionalPriceCents: z.number().int().positive(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PRO') {
    return NextResponse.json({ error: 'Only pros can submit a change order.' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { quote: { include: { proProfile: true } }, request: true },
  });

  if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  const proProfile = booking.quote.proProfile;
  if (proProfile.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }
  if (booking.status !== 'SCHEDULED' && booking.status !== 'IN_PROGRESS') {
    return NextResponse.json({ error: 'Change orders can only be submitted on an active booking.' }, { status: 409 });
  }

  const { description, additionalPriceCents } = parsed.data;

  // Billed the same way a quote is: a flat fee per submission for a
  // pay-per-quote pro, free for a subscriber.
  const isActiveSubscriber = proProfile.subscriptionStatus === 'ACTIVE';
  const feeRequiredCents = isActiveSubscriber ? null : QUOTE_PRICE_CENTS;

  const changeOrder = await prisma.changeOrder.create({
    data: { bookingId: booking.id, description, additionalPriceCents, feeRequiredCents, feePaidAt: null },
  });

  if (feeRequiredCents) {
    try {
      const stripeCustomerId = await getOrCreateStripeCustomerId(proProfile, session.user.email ?? '');
      const checkoutUrl = await createChangeOrderFeeCheckoutSession({
        changeOrderId: changeOrder.id,
        requestId: booking.requestId,
        requestTitle: booking.request.title,
        stripeCustomerId,
      });
      return NextResponse.json({ id: changeOrder.id, checkoutUrl });
    } catch (error) {
      console.error('Failed to start change order fee checkout', error);
      return NextResponse.json(
        { id: changeOrder.id, error: 'Your change order is saved, but payment could not be started — try again shortly.' },
        { status: 502 },
      );
    }
  }

  await notifyChangeOrderLive(changeOrder.id);

  return NextResponse.json({ id: changeOrder.id });
}
