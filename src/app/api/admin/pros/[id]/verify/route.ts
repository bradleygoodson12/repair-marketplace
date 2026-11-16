import { after, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAdminSession } from '@/lib/admin';
import { offerNextWaitlistSpot, reconcileCapacityAfterActivation } from '@/lib/capacity';
import { sendProVerifiedEmail } from '@/lib/email';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';

const schema = z.object({ verified: z.boolean() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.proProfile.findUnique({ where: { id }, include: { user: true, categories: true } });
  if (!existing) return NextResponse.json({ error: 'Pro not found.' }, { status: 404 });

  await prisma.proProfile.update({ where: { id }, data: { verified: parsed.data.verified } });

  if (parsed.data.verified && !existing.verified) {
    after(() => sendProVerifiedEmail({ to: existing.user.email, businessName: existing.businessName }));
    after(() =>
      notify({
        userId: existing.userId,
        type: 'PRO_VERIFIED',
        title: 'Your profile has been verified',
        url: '/dashboard/pro',
      }),
    );

    // Unverified pros don't count against the capacity cap, so several can
    // pile into the same full category while pending review. The moment
    // this one actually becomes verified (and so actually occupies a slot),
    // re-check each category they hold and bump any now-over-cap one back
    // to the waitlist instead of letting the cap silently blow past 5.
    if (existing.serviceCity && existing.serviceState && existing.categories.length > 0) {
      const { serviceCity, serviceState } = existing;
      after(() =>
        reconcileCapacityAfterActivation(
          existing.id,
          serviceCity,
          serviceState,
          existing.categories.map((c) => c.categoryId),
        ),
      );
    }
  }

  // Losing verification vacates every category slot this pro held — offer
  // each one to its waitlist, if any.
  if (!parsed.data.verified && existing.verified && existing.serviceCity && existing.serviceState) {
    const { serviceCity, serviceState } = existing;
    after(() =>
      Promise.all(existing.categories.map((c) => offerNextWaitlistSpot(c.categoryId, serviceCity, serviceState))),
    );
  }

  return NextResponse.json({ ok: true });
}
