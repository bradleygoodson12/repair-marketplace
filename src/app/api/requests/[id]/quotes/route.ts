import { getServerSession } from 'next-auth';
import { NextResponse, after } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { sendQuoteSubmittedEmail } from '@/lib/email';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';
import { QUOTE_PRICE_CENTS } from '@/lib/pricing';
import { createQuoteFeeCheckoutSession } from '@/lib/quote-fee';

const schema = z.object({
  priceCents: z.number().int().positive(),
  isEstimate: z.boolean().optional().default(false),
  message: z.string().min(1),
  estimatedDurationDays: z.number().int().positive().nullable().optional(),
});

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

  const request = await prisma.serviceRequest.findUnique({ where: { id }, include: { customer: true } });
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
    const checkoutUrl = await createQuoteFeeCheckoutSession({
      quoteId: quote.id,
      requestId: request.id,
      requestTitle: request.title,
      stripeCustomerId: proProfile.stripeCustomerId,
      userEmail: session.user.email ?? null,
    });
    return NextResponse.json({ id: quote.id, checkoutUrl });
  }

  await prisma.serviceRequest.update({ where: { id: request.id }, data: { status: 'QUOTED' } });

  if (!wasLive) {
    after(() =>
      sendQuoteSubmittedEmail({
        to: request.customer.email,
        requestTitle: request.title,
        businessName: proProfile.businessName,
        priceCents: quote.priceCents,
        isEstimate: quote.isEstimate,
        requestId: request.id,
      }),
    );
    after(() =>
      notify({
        userId: request.customerId,
        type: 'QUOTE_SUBMITTED',
        title: `New quote submitted: ${request.title}`,
        url: `/requests/${request.id}`,
      }),
    );
  }

  return NextResponse.json({ id: quote.id });
}
