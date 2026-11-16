import { getServerSession } from 'next-auth';
import { NextResponse, after } from 'next/server';

import { authOptions } from '@/lib/auth';
import { sendChangeOrderApprovedEmail } from '@/lib/email';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const changeOrder = await prisma.changeOrder.findUnique({
    where: { id },
    include: { booking: { include: { quote: { include: { proProfile: { include: { user: true } } } }, request: true } } },
  });
  if (!changeOrder) return NextResponse.json({ error: 'Change order not found.' }, { status: 404 });
  if (changeOrder.booking.request.customerId !== session.user.id) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }
  if (changeOrder.status !== 'PENDING') {
    return NextResponse.json({ error: 'This change order has already been decided.' }, { status: 409 });
  }
  if (changeOrder.feeRequiredCents && !changeOrder.feePaidAt) {
    return NextResponse.json({ error: 'This change order is not yet visible — ask the pro to complete payment.' }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.changeOrder.update({ where: { id: changeOrder.id }, data: { status: 'APPROVED' } }),
    prisma.booking.update({
      where: { id: changeOrder.bookingId },
      data: { totalCents: { increment: changeOrder.additionalPriceCents } },
    }),
  ]);

  after(() =>
    sendChangeOrderApprovedEmail({
      to: changeOrder.booking.quote.proProfile.user.email,
      requestTitle: changeOrder.booking.request.title,
      additionalPriceCents: changeOrder.additionalPriceCents,
      requestId: changeOrder.booking.requestId,
    }),
  );
  after(() =>
    notify({
      userId: changeOrder.booking.quote.proProfile.userId,
      type: 'CHANGE_ORDER_APPROVED',
      title: `Change order approved: ${changeOrder.booking.request.title}`,
      url: `/requests/${changeOrder.booking.requestId}`,
    }),
  );

  return NextResponse.json({ ok: true });
}
