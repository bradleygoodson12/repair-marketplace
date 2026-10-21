import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { authOptions } from '@/lib/auth';
import { SUBSCRIPTION_PRICE_CENTS } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { getOrCreateStripeCustomerId } from '@/lib/stripe-customer';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PRO') {
    return NextResponse.json({ error: 'Only pros can subscribe.' }, { status: 403 });
  }

  const proProfile = await prisma.proProfile.findUnique({ where: { userId: session.user.id } });
  if (!proProfile) {
    return NextResponse.json({ error: 'Complete your pro profile first.' }, { status: 403 });
  }
  if (!proProfile.verified) {
    return NextResponse.json(
      { error: 'Your profile must be verified before you can subscribe.' },
      { status: 403 },
    );
  }
  if (proProfile.subscriptionStatus === 'ACTIVE') {
    return NextResponse.json({ error: 'You already have an active subscription.' }, { status: 409 });
  }

  const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  // Prefer a real Stripe Price (set up once in the dashboard or via API) so
  // every subscription rolls up to one Price object in Stripe's own
  // reporting/MRR views — falls back to an inline ad-hoc price if one isn't
  // configured yet, so this works out of the box either way.
  const priceLineItem: Stripe.Checkout.SessionCreateParams.LineItem = process.env.STRIPE_SUBSCRIPTION_PRICE_ID
    ? { price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID, quantity: 1 }
    : {
        price_data: {
          currency: 'usd',
          product_data: { name: 'Repair Bee pro subscription — unlimited quotes' },
          unit_amount: SUBSCRIPTION_PRICE_CENTS,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      };

  try {
    const stripeCustomerId = await getOrCreateStripeCustomerId(proProfile, session.user.email ?? '');

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      line_items: [priceLineItem],
      metadata: { proProfileId: proProfile.id },
      success_url: `${origin}/dashboard/pro?subscription=success`,
      cancel_url: `${origin}/dashboard/pro?subscription=cancelled`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Failed to start subscription checkout', error);
    return NextResponse.json({ error: 'Could not start checkout — try again shortly.' }, { status: 502 });
  }
}
