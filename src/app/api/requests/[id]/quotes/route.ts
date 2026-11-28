import { getServerSession } from 'next-auth';
import { NextResponse, after } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { sendQuoteConfirmationEmail, sendQuoteRevisedEmail, sendQuoteSubmittedEmail } from '@/lib/email';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';
import { QUOTE_PRICE_CENTS } from '@/lib/pricing';
import { createQuoteFeeCheckoutSession } from '@/lib/quote-fee';
import { getOrCreateStripeCustomerId } from '@/lib/stripe-customer';

const schema = z
  .object({
    priceCents: z.number().int().positive(),
    priceMaxCents: z.number().int().positive().nullable().optional(),
    isEstimate: z.boolean().optional().default(false),
    message: z.string().min(1),
    estimatedDurationDays: z.number().int().positive().nullable().optional(),
  })
  .refine((data) => !data.priceMaxCents || data.priceMaxCents > data.priceCents, {
    message: 'The high end of a range must be more than the low end.',
    path: ['priceMaxCents'],
  })
  // A range is inherently not a firm bid — enforced here rather than trusted
  // from the client, so a mis-set checkbox can't produce a "firm" range.
  .transform((data) => ({ ...data, isEstimate: data.priceMaxCents ? true : data.isEstimate }));

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PRO') {
    return NextResponse.json({ error: 'Only pros can submit quotes.' }, { status: 403 });
  }

  const proProfile = await prisma.proProfile.findUnique({ where: { userId: session.user.id } });
  if (!proProfile) {
    return NextResponse.json({ error: 'Complete your pro profile before quoting.' }, { status: 403 });
  }
  if (!proProfile.verified) {
    return NextResponse.json({ error: 'Your profile must be verified before you can submit quotes.' }, { status: 403 });
  }

  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    include: { customer: true, property: true },
  });
  if (!request) {
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  }
  if (request.status !== 'OPEN' && request.status !== 'QUOTED') {
    return NextResponse.json({ error: 'This request is no longer accepting quotes.' }, { status: 409 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existingQuote = await prisma.quote.findUnique({
    where: { requestId_proProfileId: { requestId: request.id, proProfileId: proProfile.id } },
  });

  // Fee requirement is fixed at submission time from the pro's current
  // subscription status — a later subscription change doesn't retroactively
  // alter a quote already sent or already paid for.
  const isActiveSubscriber = proProfile.subscriptionStatus === 'ACTIVE';
  const quoteFeeRequiredCents = isActiveSubscriber ? null : QUOTE_PRICE_CENTS;
  const keepsPriorPayment = !!existingQuote?.quoteFeePaidAt && existingQuote.quoteFeeRequiredCents === quoteFeeRequiredCents;
  // Only notify the customer the first time their quote becomes visible —
  // not on every edit of a quote that's already live.
  const wasLive = !!existingQuote && (!existingQuote.quoteFeeRequiredCents || !!existingQuote.quoteFeePaidAt);

  const quote = await prisma.quote.upsert({
    where: { requestId_proProfileId: { requestId: request.id, proProfileId: proProfile.id } },
    update: {
      ...parsed.data,
      status: 'PENDING',
      quoteFeeRequiredCents,
      quoteFeePaidAt: keepsPriorPayment ? existingQuote!.quoteFeePaidAt : null,
    },
    create: {
      ...parsed.data,
      requestId: request.id,
      proProfileId: proProfile.id,
      quoteFeeRequiredCents,
      quoteFeePaidAt: null,
    },
  });

  // Fee owed and not yet paid — the quote exists but stays hidden from the
  // customer and other pros until payment clears (see requests/[id]/page.tsx
  // and the stripe webhook's handleQuoteFeeCheckout).
  if (quoteFeeRequiredCents && !quote.quoteFeePaidAt) {
    try {
      const stripeCustomerId = await getOrCreateStripeCustomerId(proProfile, session.user.email ?? '');
      const checkoutUrl = await createQuoteFeeCheckoutSession({
        quoteId: quote.id,
        requestId: request.id,
        requestTitle: request.title,
        stripeCustomerId,
      });
      return NextResponse.json({ id: quote.id, checkoutUrl });
    } catch (error) {
      console.error('Failed to start quote fee checkout', error);
      return NextResponse.json(
        { id: quote.id, error: 'Your quote is saved, but payment could not be started — try again shortly.' },
        { status: 502 },
      );
    }
  }

  await prisma.serviceRequest.update({ where: { id: request.id }, data: { status: 'QUOTED' } });

  const propertyAddress = `${request.property.addressLine1}, ${request.property.city}, ${request.property.state}`;

  // First time this quote becomes visible to the customer → "submitted".
  // Already visible, now edited → "revised". A quote still held back behind
  // an unpaid fee isn't live yet, so an edit to it stays silent either way —
  // nothing to reveal to the customer until it's actually visible.
  if (!wasLive) {
    for (const to of [request.customer.email, ...request.ccEmails]) {
      after(() =>
        sendQuoteSubmittedEmail({
          to,
          requestTitle: request.title,
          propertyAddress,
          businessName: proProfile.businessName,
          priceCents: quote.priceCents,
          priceMaxCents: quote.priceMaxCents,
          isEstimate: quote.isEstimate,
          requestId: request.id,
        }),
      );
    }
    after(() =>
      notify({
        userId: request.customerId,
        type: 'QUOTE_SUBMITTED',
        title: `New quote submitted: ${request.title}`,
        url: `/requests/${request.id}`,
      }),
    );
    // Reaching here with a non-null quoteFeeRequiredCents means this pro is
    // a subscriber whose fee was waived (see the check above) — a pro who
    // actually owes the fee returns earlier via Stripe Checkout, and gets
    // this same confirmation from the webhook once that payment clears.
    if (session.user.email) {
      after(() =>
        sendQuoteConfirmationEmail({
          to: session.user.email!,
          requestTitle: request.title,
          propertyAddress,
          requestId: request.id,
          feeChargedCents: null,
        }),
      );
    }
  } else {
    for (const to of [request.customer.email, ...request.ccEmails]) {
      after(() =>
        sendQuoteRevisedEmail({
          to,
          requestTitle: request.title,
          businessName: proProfile.businessName,
          priceCents: quote.priceCents,
          priceMaxCents: quote.priceMaxCents,
          isEstimate: quote.isEstimate,
          requestId: request.id,
        }),
      );
    }
    after(() =>
      notify({
        userId: request.customerId,
        type: 'QUOTE_REVISED',
        title: `Quote revised: ${request.title}`,
        url: `/requests/${request.id}`,
      }),
    );
  }

  return NextResponse.json({ id: quote.id });
}
