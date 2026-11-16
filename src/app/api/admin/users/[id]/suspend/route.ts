import { after, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAdminSession } from '@/lib/admin';
import { offerNextWaitlistSpot, reconcileCapacityAfterActivation } from '@/lib/capacity';
import { prisma } from '@/lib/prisma';

const schema = z.object({ suspended: z.boolean() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (id === session.user.id) {
    return NextResponse.json({ error: "You can't suspend your own account." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    include: { proProfile: { include: { categories: true } } },
  });
  if (!existing) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  await prisma.user.update({ where: { id }, data: { suspended: parsed.data.suspended } });

  const profile = existing.proProfile;

  // Newly suspending a verified pro vacates every category slot they held.
  if (parsed.data.suspended && !existing.suspended && profile?.verified && profile.serviceCity && profile.serviceState) {
    const { serviceCity, serviceState } = profile;
    after(() =>
      Promise.all(profile.categories.map((c) => offerNextWaitlistSpot(c.categoryId, serviceCity, serviceState))),
    );
  }

  // Un-suspending a verified pro makes their categories count against the
  // cap again — others may have filled them while this pro was suspended,
  // so re-check and bump any now-over-cap category back to the waitlist.
  if (!parsed.data.suspended && existing.suspended && profile?.verified && profile.serviceCity && profile.serviceState) {
    const { serviceCity, serviceState } = profile;
    after(() =>
      reconcileCapacityAfterActivation(
        profile.id,
        serviceCity,
        serviceState,
        profile.categories.map((c) => c.categoryId),
      ),
    );
  }

  return NextResponse.json({ ok: true });
}
