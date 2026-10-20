import { headers } from 'next/headers';
import { NextResponse, after } from 'next/server';
import type Stripe from 'stripe';

import { sendQuoteSubmittedEmail, sendSubscriptionPastDueEmail } from '@/lib/email';
import { notify } from '@/lib/notify';
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
      // Successfully subscribing is the moment a pay-per-quote pro becomes
      // a subscriber — no separate "switch mode" step needed on their end.
      billingMode: 'SUBSCRIPTION',
    },
  });
}

// Pay-per-quote fee — a one-time payment, not a subscription. Clears the
// quote to send: marks it paid and (re)opens it up to the customer by
// moving the request to QUOTED, the step quote submission deferred while
// payment was pending. Idempotent against Stripe's at-least-once delivery
// since a second update just re-sets the same paidAt-ish state.
async function handleQuoteFeeCheckout(checkoutSession: Stripe.Checkout.Session) {
  const { kind, quoteId } = checkoutSession.metadata ?? {};
  if (kind !== 'quote_fee' || !quoteId) return;

  const existing = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!existing) return;
  // Stripe delivers webhooks at-least-once — a quote already marked paid
  // means this is a duplicate delivery, so skip re-notifying the customer.
  const alreadyPaid = !!existing.quoteFeePaidAt;

  const quote = await prisma.quote.update({
    where: { id: quoteId },
    data: { quoteFeePaidAt: new Date(), stripeSessionId: checkoutSession.id },
    include: { request: { include: { customer: true } }, proProfile: true },
  });

  await prisma.serviceRequest.update({ where: { id: quote.requestId }, data: { status: 'QUOTED' } });

  if (alreadyPaid) return;

  after(() =>
    sendQuoteSubmittedEmail({
      to: quote.request.customer.email,
      requestTitle: quote.request.title,
      businessName: quote.proProfile.businessName,
      priceCents: quote.priceCents,
      isEstimate: quote.isEstimate,
      requestId: quote.requestId,
    }),
  );
  after(() =>
    notify({
      userId: quote.request.customerId,
      type: 'QUOTE_SUBMITTED',
      title: `New quote submitted: ${quote.request.title}`,
      url: `/requests/${quote.requestId}`,
    }),
  );
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
    after(() =>
      notify({
        userId: proProfile.userId,
        type: 'SUBSCRIPTION_PAST_DUE',
        title: 'Your subscription payment is past due',
        url: '/dashboard/pro',
      }),
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
    case 'checkout.session.completed': {
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      if (checkoutSession.mode === 'payment') {
        await handleQuoteFeeCheckout(checkoutSession);
      } else {
        await handleSubscriptionCheckout(checkoutSession);
      }
      break;
    }
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
  }

  return NextResponse.json({ received: true });
}
