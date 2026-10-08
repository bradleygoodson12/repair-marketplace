import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
  if (proProfile.subscriptionStatus !== 'ACTIVE') {
    return NextResponse.json(
      { error: 'An active subscription is required to submit quotes. Subscribe from your dashboard.' },
      { status: 403 },
    );
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

  const quote = await prisma.quote.upsert({
    where: { requestId_proProfileId: { requestId: request.id, proProfileId: proProfile.id } },
    update: { ...parsed.data, status: 'PENDING' },
    create: { ...parsed.data, requestId: request.id, proProfileId: proProfile.id },
  });

  await prisma.serviceRequest.update({ where: { id: request.id }, data: { status: 'QUOTED' } });

  return NextResponse.json({ id: quote.id });
}
