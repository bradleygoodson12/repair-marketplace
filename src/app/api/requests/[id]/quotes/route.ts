import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { LEAD_FEE_CENTS } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

const schema = z.object({
  priceCents: z.number().int().positive(),
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

  const request = await prisma.serviceRequest.findUnique({ where: { id } });
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

  // Subscribed pros quote for free. Everyone else pays a flat lead fee per
  // quote, charged before the quote is ever visible to the customer.
  if (proProfile.subscriptionStatus === 'ACTIVE') {
    const quote = await prisma.quote.upsert({
      where: { requestId_proProfileId: { requestId: request.id, proProfileId: proProfile.id } },
      update: { ...parsed.data, status: 'PENDING' },
      create: { ...parsed.data, requestId: request.id, proProfileId: proProfile.id },
    });

    await prisma.serviceRequest.update({ where: { id: request.id }, data: { status: 'QUOTED' } });

    return NextResponse.json({ id: quote.id });
  }

  const leadCharge = await prisma.leadCharge.create({
    data: {
      proProfileId: proProfile.id,
      requestId: request.id,
      priceCents: parsed.data.priceCents,
      message: parsed.data.message,
      estimatedDurationDays: parsed.data.estimatedDurationDays ?? null,
      feeCents: LEAD_FEE_CENTS,
    },
  });

  const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: session.user.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: `Lead fee — ${request.title}` },
          unit_amount: LEAD_FEE_CENTS,
        },
        quantity: 1,
      },
    ],
    metadata: { leadChargeId: leadCharge.id },
    success_url: `${origin}/requests/${request.id}?quote=paid`,
    cancel_url: `${origin}/requests/${request.id}?quote=cancelled`,
  });

  await prisma.leadCharge.update({
    where: { id: leadCharge.id },
    data: { stripeCheckoutSessionId: checkoutSession.id },
  });

  return NextResponse.json({ checkoutUrl: checkoutSession.url });
}
