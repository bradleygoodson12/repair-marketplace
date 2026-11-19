import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// Separate from /api/webhooks/stripe on purpose: events about connected
// accounts (account.updated) only reach a webhook endpoint created with
// connect: true, which Stripe always signs with its own secret — a
// different one from the regular account's webhook endpoint, even if both
// point at the same app. Two endpoints, two secrets, two routes.
async function handleAccountUpdated(account: Stripe.Account) {
  const proProfile = await prisma.proProfile.findFirst({ where: { stripeConnectAccountId: account.id } });
  if (!proProfile) return;

  const detailsSubmitted = !!account.details_submitted;
  if (detailsSubmitted === proProfile.stripeConnectDetailsSubmitted) return;

  await prisma.proProfile.update({
    where: { id: proProfile.id },
    data: {
      stripeConnectDetailsSubmitted: detailsSubmitted,
      // Only set once, the first time verification completes — later
      // Stripe re-checks (e.g. a requirement coming due again) shouldn't
      // erase when a pro originally got verified.
      stripeConnectVerifiedAt: detailsSubmitted ? (proProfile.stripeConnectVerifiedAt ?? new Date()) : proProfile.stripeConnectVerifiedAt,
    },
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed.' }, { status: 400 });
  }

  if (event.type === 'account.updated') {
    await handleAccountUpdated(event.data.object as Stripe.Account);
  }

  return NextResponse.json({ received: true });
}
