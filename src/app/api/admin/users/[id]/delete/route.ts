import { after, NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/admin';
import { offerNextWaitlistSpot } from '@/lib/capacity';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const { id } = await params;
  if (id === session.user.id) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    include: { proProfile: { include: { categories: true } } },
  });
  if (!existing) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const profile = existing.proProfile;

  // Every dependent row (ProProfile, ServiceRequest, Quote, Booking, Review,
  // etc.) cascades from this one delete — see the onDelete: Cascade chains
  // in schema.prisma.
  await prisma.user.delete({ where: { id } });

  // Deleting a verified pro vacates every category slot they held, same as
  // suspending one — offer each to its waitlist, if any.
  if (profile?.verified && profile.serviceCity && profile.serviceState) {
    const { serviceCity, serviceState } = profile;
    after(() =>
      Promise.all(profile.categories.map((c) => offerNextWaitlistSpot(c.categoryId, serviceCity, serviceState))),
    );
  }

  return NextResponse.json({ ok: true });
}
