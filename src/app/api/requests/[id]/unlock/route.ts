import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { LEAD_PRICE_CENTS } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// Starts a one-time Stripe Checkout for a pay-per-lead pro to unlock a
// single request — full description, photos, exact address, and the
// ability to quote. Mirrors the subscription checkout route, but mode:
// 'payment' instead of 'subscription', and scoped to one requestId via
// metadata so the webhook knows which LeadUnlock row to create.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PRO') {
    return NextResponse.json({ error: 'Only pros can unlock leads.' }, { status: 403 });
  }

  const proProfile = await prisma.proProfile.findUnique({ where: { userId: session.user.id } });
  if (!proProfile) {
    return NextResponse.json({ error: 'Complete your pro profile first.' }, { status: 403 });
  }
  if (!proProfile.verified) {
    return NextResponse.json({ error: 'Your profile must be verified before you can unlock leads.' }, { status: 403 });
  }
  if (proProfile.subscriptionStatus === 'ACTIVE') {
    return NextResponse.json({ error: 'Your subscription already gives you full access to every lead.' }, { status: 409 });
  }

  const request = await prisma.serviceRequest.findUnique({ where: { id }, include: { category: true } });
  if (!request) {
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  }

  const existingUnlock = await prisma.leadUnlock.findUnique({
    where: { proProfileId_requestId: { proProfileId: proProfile.id, requestId: request.id } },
  });
  if (existingUnlock) {
    return NextResponse.json({ error: 'You already unlocked this lead.' }, { status: 409 });
  }

  const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: proProfile.stripeCustomerId ? undefined : session.user.email ?? undefined,
    customer: proProfile.stripeCustomerId ?? undefined,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: `Unlock lead: ${request.category.name} — ${request.title}` },
          unit_amount: LEAD_PRICE_CENTS,
        },
        quantity: 1,
      },
    ],
    metadata: { kind: 'lead_unlock', proProfileId: proProfile.id, requestId: request.id },
    success_url: `${origin}/requests/${request.id}?unlock=success`,
    cancel_url: `${origin}/requests/${request.id}?unlock=cancelled`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
