import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Removes a lead from this pro's own dashboard list only — every other
// matching pro still sees it, the request's status is untouched, and the
// customer sees no change. A pro who changes their mind can still quote it
// directly from the request's own page.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PRO') {
    return NextResponse.json({ error: 'Only pros can decline leads.' }, { status: 403 });
  }

  const proProfile = await prisma.proProfile.findUnique({ where: { userId: session.user.id } });
  if (!proProfile) {
    return NextResponse.json({ error: 'Complete your pro profile first.' }, { status: 403 });
  }

  const request = await prisma.serviceRequest.findUnique({ where: { id } });
  if (!request) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const existingQuote = await prisma.quote.findUnique({
    where: { requestId_proProfileId: { requestId: id, proProfileId: proProfile.id } },
  });
  if (existingQuote) {
    return NextResponse.json({ error: "You've already quoted this one — nothing to decline." }, { status: 409 });
  }

  await prisma.proLeadDismissal.upsert({
    where: { proProfileId_serviceRequestId: { proProfileId: proProfile.id, serviceRequestId: id } },
    create: { proProfileId: proProfile.id, serviceRequestId: id },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
