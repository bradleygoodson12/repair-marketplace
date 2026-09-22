import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { request: true, quote: { include: { proProfile: true } } },
  });

  if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  if (booking.request.customerId !== session.user.id) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }
  if (booking.paymentStatus === 'PAID') {
    return NextResponse.json({ error: 'This booking is already paid.' }, { status: 409 });
  }

  const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${booking.request.title} — ${booking.quote.proProfile.businessName}`,
          },
          unit_amount: booking.totalCents,
        },
        quantity: 1,
      },
    ],
    metadata: { bookingId: booking.id },
    success_url: `${origin}/requests/${booking.requestId}?payment=success`,
    cancel_url: `${origin}/requests/${booking.requestId}?payment=cancelled`,
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: { paymentStatus: 'PENDING' },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
