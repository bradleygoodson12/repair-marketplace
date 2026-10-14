import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createQuoteFeeCheckoutSession } from '@/lib/quote-fee';

// Retry endpoint for a pro who left mid-checkout — the quote already
// exists (unpaid), this just re-opens a Stripe Checkout session for it.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PRO') {
    return NextResponse.json({ error: 'Only pros can pay a quote fee.' }, { status: 403 });
  }

  const proProfile = await prisma.proProfile.findUnique({ where: { userId: session.user.id } });
  if (!proProfile) {
    return NextResponse.json({ error: 'Complete your pro profile first.' }, { status: 403 });
  }

  const quote = await prisma.quote.findUnique({ where: { id }, include: { request: true } });
  if (!quote || quote.proProfileId !== proProfile.id) {
    return NextResponse.json({ error: 'Quote not found.' }, { status: 404 });
  }
  if (!quote.quoteFeeRequiredCents) {
    return NextResponse.json({ error: 'This quote has no fee owed.' }, { status: 409 });
  }
  if (quote.quoteFeePaidAt) {
    return NextResponse.json({ error: 'This quote fee is already paid.' }, { status: 409 });
  }

  const checkoutUrl = await createQuoteFeeCheckoutSession({
    quoteId: quote.id,
    requestId: quote.requestId,
    requestTitle: quote.request.title,
    stripeCustomerId: proProfile.stripeCustomerId,
    userEmail: session.user.email ?? null,
  });

  return NextResponse.json({ url: checkoutUrl });
}
