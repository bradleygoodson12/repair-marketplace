import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const schema = z.object({ reply: z.string().trim().min(1).max(2000) });

// One public reply per review, from the pro it was left for — lets them
// respond to context (a misunderstanding, a since-fixed issue) right where
// customers read the review, same as most review platforms.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PRO') {
    return NextResponse.json({ error: 'Only pro accounts can reply to reviews.' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const review = await prisma.review.findUnique({ where: { id }, include: { proProfile: true } });
  if (!review) return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
  if (review.proProfile.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  await prisma.review.update({
    where: { id },
    data: { proReply: parsed.data.reply, proReplyAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
