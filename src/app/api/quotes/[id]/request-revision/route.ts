import { getServerSession } from 'next-auth';
import { NextResponse, after } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { sendRevisionRequestedEmail } from '@/lib/email';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

const schema = z.object({ message: z.string().min(1) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const allowed = await checkRateLimit(`request-revision:${session.user.id}`, 30, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Slow down a bit.' }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { request: true, proProfile: { include: { user: true } } },
  });

  if (!quote) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 });
  if (quote.request.customerId !== session.user.id) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }
  if (quote.status !== 'PENDING') {
    return NextResponse.json({ error: 'Only a pending quote can be revised.' }, { status: 409 });
  }

  const { message } = parsed.data;

  // Posted into the same shared thread every pro on this request already
  // reads — this is a targeted ask to one pro, not a broadcast, so it skips
  // the generic /api/messages fan-out and emails only that pro directly.
  await prisma.message.create({
    data: { requestId: quote.requestId, senderId: session.user.id, body: message },
  });

  after(() =>
    sendRevisionRequestedEmail({
      to: quote.proProfile.user.email,
      requestTitle: quote.request.title,
      customerName: session.user.name ?? 'The customer',
      message,
      requestId: quote.requestId,
    }),
  );
  after(() =>
    notify({
      userId: quote.proProfile.userId,
      type: 'QUOTE_REVISION_REQUESTED',
      title: `Revision requested: ${quote.request.title}`,
      body: message,
      url: `/requests/${quote.requestId}`,
    }),
  );

  return NextResponse.json({ ok: true });
}
