import { QUOTE_PRICE_CENTS } from '@/lib/pricing';
import { stripe } from '@/lib/stripe';

// Shared by the initial quote submission (which creates the checkout
// inline) and the standalone "complete payment" retry route, so a pro who
// navigates away before paying can come back and finish without
// resubmitting their quote.
export async function createQuoteFeeCheckoutSession(params: {
  quoteId: string;
  requestId: string;
  requestTitle: string;
  stripeCustomerId: string | null;
  userEmail: string | null;
}) {
  const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: params.stripeCustomerId ? undefined : params.userEmail ?? undefined,
    customer: params.stripeCustomerId ?? undefined,
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
    success_url: `${origin}/requests/${params.requestId}?quote=paid`,
    cancel_url: `${origin}/requests/${params.requestId}?quote=payment_cancelled`,
  });

  return checkoutSession.url;
}
