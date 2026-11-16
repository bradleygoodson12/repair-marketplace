import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { createChangeOrderFeeCheckoutSession } from '@/lib/change-order-fee';
import { prisma } from '@/lib/prisma';
import { getOrCreateStripeCustomerId } from '@/lib/stripe-customer';

// Retry endpoint for a pro who left mid-checkout — mirrors
// /api/quotes/[id]/pay for ChangeOrder instead of Quote.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PRO') {
    return NextResponse.json({ error: 'Only pros can pay a change order fee.' }, { status: 403 });
  }

  const proProfile = await prisma.proProfile.findUnique({ where: { userId: session.user.id } });
  if (!proProfile) {
    return NextResponse.json({ error: 'Complete your pro profile first.' }, { status: 403 });
  }

  const changeOrder = await prisma.changeOrder.findUnique({
    where: { id },
    include: { booking: { include: { quote: true, request: true } } },
  });
  if (!changeOrder || changeOrder.booking.quote.proProfileId !== proProfile.id) {
    return NextResponse.json({ error: 'Change order not found.' }, { status: 404 });
  }
  if (!changeOrder.feeRequiredCents) {
    return NextResponse.json({ error: 'This change order has no fee owed.' }, { status: 409 });
  }
  if (changeOrder.feePaidAt) {
    return NextResponse.json({ error: 'This change order fee is already paid.' }, { status: 409 });
  }

  try {
    const stripeCustomerId = await getOrCreateStripeCustomerId(proProfile, session.user.email ?? '');
    const checkoutUrl = await createChangeOrderFeeCheckoutSession({
      changeOrderId: changeOrder.id,
      requestId: changeOrder.booking.requestId,
      requestTitle: changeOrder.booking.request.title,
      stripeCustomerId,
    });
    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error('Failed to start change order fee checkout', error);
    return NextResponse.json({ error: 'Could not start payment — try again shortly.' }, { status: 502 });
  }
}
