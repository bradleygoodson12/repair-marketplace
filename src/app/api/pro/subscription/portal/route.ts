import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PRO') {
    return NextResponse.json({ error: 'Only pros can manage billing.' }, { status: 403 });
  }

  const proProfile = await prisma.proProfile.findUnique({ where: { userId: session.user.id } });
  if (!proProfile?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account found.' }, { status: 404 });
  }

  const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: proProfile.stripeCustomerId,
    return_url: `${origin}/dashboard/pro`,
  });

  return NextResponse.json({ url: portalSession.url });
}
