import { after } from 'next/server';

import { sendChangeOrderApprovalRequestedEmail, sendChangeOrderSubmittedEmail } from '@/lib/email';
import { notify } from '@/lib/notify';
import { QUOTE_PRICE_CENTS } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// Mirrors quote-fee.ts: a change order is billed the same way an initial
// quote is (same flat fee), so this is the same reuse-an-open-session /
// create-a-new-one pattern, just for ChangeOrder instead of Quote.
export async function createChangeOrderFeeCheckoutSession(params: {
  changeOrderId: string;
  requestId: string;
  requestTitle: string;
  stripeCustomerId: string;
}) {
  const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const existing = await prisma.changeOrder.findUnique({
    where: { id: params.changeOrderId },
    select: { stripeSessionId: true },
  });
  if (existing?.stripeSessionId) {
    try {
      const existingSession = await stripe.checkout.sessions.retrieve(existing.stripeSessionId);
      if (existingSession.status === 'open' && existingSession.url) {
        return existingSession.url;
      }
    } catch {
      // Session not found or unreadable — fall through and create a new one.
    }
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer: params.stripeCustomerId,
    submit_type: 'pay',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: `Change order fee: ${params.requestTitle}` },
          unit_amount: QUOTE_PRICE_CENTS,
        },
        quantity: 1,
      },
    ],
    // Same reasoning as quote-fee.ts: a one-time payment doesn't get an
    // invoice automatically, so ask Stripe to generate one here too.
    invoice_creation: {
      enabled: true,
      invoice_data: { description: `Repair Bee change order fee — ${params.requestTitle}` },
    },
    metadata: { kind: 'change_order_fee', changeOrderId: params.changeOrderId },
    success_url: `${origin}/dashboard/pro?changeOrder=paid`,
    cancel_url: `${origin}/requests/${params.requestId}?changeOrder=payment_cancelled`,
  });

  await prisma.changeOrder.update({
    where: { id: params.changeOrderId },
    data: { stripeSessionId: checkoutSession.id },
  });

  return checkoutSession.url;
}

// Shared by the free (subscriber) submission path and the webhook's paid
// path — the moment a change order actually becomes visible to the
// customer, both sides get notified: the pro that it went out, the
// customer that it needs approval.
export async function notifyChangeOrderLive(changeOrderId: string) {
  const changeOrder = await prisma.changeOrder.findUnique({
    where: { id: changeOrderId },
    include: {
      booking: {
        include: {
          quote: { include: { proProfile: { include: { user: true } } } },
          request: { include: { customer: true } },
        },
      },
    },
  });
  if (!changeOrder) return;
  const { booking } = changeOrder;

  after(() =>
    sendChangeOrderSubmittedEmail({
      to: booking.quote.proProfile.user.email,
      requestTitle: booking.request.title,
      requestId: booking.requestId,
    }),
  );
  after(() =>
    sendChangeOrderApprovalRequestedEmail({
      to: booking.request.customer.email,
      requestTitle: booking.request.title,
      businessName: booking.quote.proProfile.businessName,
      description: changeOrder.description,
      additionalPriceCents: changeOrder.additionalPriceCents,
      requestId: booking.requestId,
    }),
  );
  after(() =>
    notify({
      userId: booking.quote.proProfile.userId,
      type: 'CHANGE_ORDER_SUBMITTED',
      title: `Change order submitted: ${booking.request.title}`,
      url: `/requests/${booking.requestId}`,
    }),
  );
  after(() =>
    notify({
      userId: booking.request.customerId,
      type: 'CHANGE_ORDER_APPROVAL_REQUESTED',
      title: `Change order needs approval: ${booking.request.title}`,
      body: changeOrder.description,
      url: `/requests/${booking.requestId}`,
    }),
  );
}
