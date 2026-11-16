import { getServerSession } from 'next-auth';
import { NextResponse, after } from 'next/server';

import { authOptions } from '@/lib/auth';
import { sendQuoteNotSelectedEmail } from '@/lib/email';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
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
    return NextResponse.json({ error: 'Only a pending quote can be declined.' }, { status: 409 });
  }

  await prisma.quote.update({ where: { id: quote.id }, data: { status: 'DECLINED' } });

  after(() =>
    sendQuoteNotSelectedEmail({
      to: quote.proProfile.user.email,
      requestTitle: quote.request.title,
      requestId: quote.requestId,
    }),
  );
  after(() =>
    notify({
      userId: quote.proProfile.userId,
      type: 'QUOTE_NOT_SELECTED',
      title: `Quote not selected: ${quote.request.title}`,
      url: `/requests/${quote.requestId}`,
    }),
  );

  return NextResponse.json({ ok: true });
}
