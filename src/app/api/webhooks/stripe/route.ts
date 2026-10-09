import { headers } from 'next/headers';
import { NextResponse, after } from 'next/server';
import type Stripe from 'stripe';

import { sendSubscriptionPastDueEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

function subscriptionStatusFromStripe(status: Stripe.Subscription.Status): 'ACTIVE' | 'PAST_DUE' | 'CANCELED' {
  if (status === 'active' || status === 'trialing') return 'ACTIVE';
  if (status === 'past_due' || status === 'unpaid') return 'PAST_DUE';
  return 'CANCELED';
}

async function handleSubscriptionCheckout(checkoutSession: Stripe.Checkout.Session) {
  const proProfileId = checkoutSession.metadata?.proProfileId;
  if (!proProfileId || typeof checkoutSession.subscription !== 'string') return;

  const subscription = await stripe.subscriptions.retrieve(checkoutSession.subscription);

  await prisma.proProfile.update({
    where: { id: proProfileId },
    data: {
      stripeCustomerId: typeof checkoutSession.customer === 'string' ? checkoutSession.customer : null,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscriptionStatusFromStripe(subscription.status),
      subscriptionCurrentPeriodEnd: new Date(subscription.items.data[0].current_period_end * 1000),
    },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const proProfile = await prisma.proProfile.findFirst({
    where: { stripeSubscriptionId: subscription.id },
    include: { user: true },
  });
  if (!proProfile) return;

  const newStatus = subscriptionStatusFromStripe(subscription.status);

  await prisma.proProfile.update({
    where: { id: proProfile.id },
    data: {
      subscriptionStatus: newStatus,
      subscriptionCurrentPeriodEnd: new Date(subscription.items.data[0].current_period_end * 1000),
    },
  });

  // Only email on the transition into PAST_DUE, not on every webhook ping
  // while it stays that way.
  if (newStatus === 'PAST_DUE' && proProfile.subscriptionStatus !== 'PAST_DUE') {
    after(() =>
      sendSubscriptionPastDueEmail({ to: proProfile.user.email, businessName: proProfile.businessName }),
    );
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const proProfile = await prisma.proProfile.findFirst({ where: { stripeSubscriptionId: subscription.id } });
  if (!proProfile) return;

  await prisma.proProfile.update({
    where: { id: proProfile.id },
    data: { subscriptionStatus: 'CANCELED' },
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature verification failed.` }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleSubscriptionCheckout(event.data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
  }

  return NextResponse.json({ received: true });
}
