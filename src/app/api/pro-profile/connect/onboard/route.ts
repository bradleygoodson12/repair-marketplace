import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createConnectOnboardingLink } from '@/lib/stripe-connect';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PRO') {
    return NextResponse.json({ error: 'Only pros can verify with Stripe.' }, { status: 403 });
  }
  if (!session.user.email) {
    return NextResponse.json({ error: 'Your account needs an email on file first.' }, { status: 400 });
  }

  const proProfile = await prisma.proProfile.findUnique({ where: { userId: session.user.id } });
  if (!proProfile) {
    return NextResponse.json({ error: 'Complete your pro profile first.' }, { status: 403 });
  }
  if (proProfile.stripeConnectDetailsSubmitted) {
    return NextResponse.json({ error: 'Your business is already verified with Stripe.' }, { status: 409 });
  }

  try {
    const url = await createConnectOnboardingLink(proProfile.id, session.user.email);
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Failed to start Stripe Connect onboarding', error);
    return NextResponse.json({ error: 'Could not start verification — try again shortly.' }, { status: 502 });
  }
}
