import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const schema = z.object({ billingMode: z.enum(['PAY_PER_QUOTE', 'SUBSCRIPTION']) });

// Switching TO subscription just flips the preference — the pro still has
// to go through checkout separately to actually become ACTIVE. Switching
// TO pay-per-quote while a Stripe subscription is actively charging them is
// refused outright: cancel it first (via the billing portal) so the DB
// preference and the real Stripe state can't silently disagree.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PRO') {
    return NextResponse.json({ error: 'Only pros can change billing mode.' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const proProfile = await prisma.proProfile.findUnique({ where: { userId: session.user.id } });
  if (!proProfile) {
    return NextResponse.json({ error: 'Complete your pro profile first.' }, { status: 403 });
  }

  if (parsed.data.billingMode === 'PAY_PER_QUOTE' && proProfile.subscriptionStatus === 'ACTIVE') {
    return NextResponse.json(
      { error: 'Cancel your active subscription from billing before switching to pay-per-quote.' },
      { status: 409 },
    );
  }

  await prisma.proProfile.update({
    where: { id: proProfile.id },
    data: { billingMode: parsed.data.billingMode },
  });

  return NextResponse.json({ ok: true });
}
