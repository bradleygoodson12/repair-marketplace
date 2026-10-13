import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

const schema = z
  .object({
    targetUserId: z.string().optional(),
    targetRequestId: z.string().optional(),
    reason: z.enum(['SPAM', 'INAPPROPRIATE', 'FRAUD', 'OTHER']),
    details: z.string().trim().max(2000).optional(),
  })
  .refine((data) => data.targetUserId || data.targetRequestId, {
    message: 'Must report either a user or a request.',
  });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const allowed = await checkRateLimit(`report:${session.user.id}`, 10, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many reports filed. Try again later.' }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { targetUserId, targetRequestId, reason, details } = parsed.data;

  if (targetUserId) {
    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) return NextResponse.json({ error: 'That user was not found.' }, { status: 404 });
  }
  if (targetRequestId) {
    const target = await prisma.serviceRequest.findUnique({ where: { id: targetRequestId } });
    if (!target) return NextResponse.json({ error: 'That request was not found.' }, { status: 404 });
  }

  const report = await prisma.report.create({
    data: {
      reporterId: session.user.id,
      targetUserId: targetUserId ?? null,
      targetRequestId: targetRequestId ?? null,
      reason,
      details: details || null,
    },
  });

  return NextResponse.json({ id: report.id });
}
