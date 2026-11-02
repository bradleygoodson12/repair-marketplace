import { QUOTE_PRICE_CENTS } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// Shared by the initial quote submission (which creates the checkout
// inline) and the standalone "complete payment" retry route, so a pro who
// navigates away before paying can come back and finish without
// resubmitting their quote.
export async function createQuoteFeeCheckoutSession(params: {
  quoteId: string;
  requestId: string;
  requestTitle: string;
  stripeCustomerId: string;
}) {
  const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  // A double-click, a second tab, or re-opening "pay" before the first
  // attempt finished could otherwise mint a second valid Checkout Session —
  // and if the pro completes both, they're charged twice. Reuse a still-open
  // one instead of creating a new one whenever possible.
  const existing = await prisma.quote.findUnique({
    where: { id: params.quoteId },
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
          product_data: { name: `Quote fee: ${params.requestTitle}` },
          unit_amount: QUOTE_PRICE_CENTS,
        },
        quantity: 1,
      },
    ],
    metadata: { kind: 'quote_fee', quoteId: params.quoteId },
    success_url: `${origin}/dashboard/pro?quote=paid`,
    cancel_url: `${origin}/requests/${params.requestId}?quote=payment_cancelled`,
  });

  await prisma.quote.update({ where: { id: params.quoteId }, data: { stripeSessionId: checkoutSession.id } });

  return checkoutSession.url;
}
