import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { SUBSCRIPTION_PRICE_CENTS } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PRO') {
    return NextResponse.json({ error: 'Only pros can subscribe.' }, { status: 403 });
  }

  const proProfile = await prisma.proProfile.findUnique({ where: { userId: session.user.id } });
  if (!proProfile) {
    return NextResponse.json({ error: 'Complete your pro profile first.' }, { status: 403 });
  }
  if (proProfile.subscriptionStatus === 'ACTIVE') {
    return NextResponse.json({ error: 'You already have an active subscription.' }, { status: 409 });
  }

  const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: proProfile.stripeCustomerId ? undefined : session.user.email ?? undefined,
    customer: proProfile.stripeCustomerId ?? undefined,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: 'Repair Bee pro subscription — unlimited quotes' },
          unit_amount: SUBSCRIPTION_PRICE_CENTS,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ],
    metadata: { proProfileId: proProfile.id },
    success_url: `${origin}/dashboard/pro?subscription=success`,
    cancel_url: `${origin}/dashboard/pro?subscription=cancelled`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
