import { getServerSession } from 'next-auth';
import { NextResponse, after } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { sendNewMessageEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  requestId: z.string(),
  body: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { requestId, body } = parsed.data;

  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    include: { quotes: { include: { proProfile: { include: { user: true } } } } },
  });
  if (!request) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });

  const isCustomer = request.customerId === session.user.id;
  const isQuotingPro = request.quotes.some((q) => q.proProfile.userId === session.user.id);
  if (!isCustomer && !isQuotingPro) {
    return NextResponse.json({ error: 'Not authorized to message on this request.' }, { status: 403 });
  }

  const message = await prisma.message.create({
    data: { requestId, senderId: session.user.id, body },
  });

  if (isCustomer) {
    after(() =>
      Promise.all(
        request.quotes.map((q) =>
          sendNewMessageEmail({
            to: q.proProfile.user.email,
            requestTitle: request.title,
            senderName: session.user.name ?? 'The customer',
            messageBody: body,
            requestId: request.id,
          }),
        ),
      ),
    );
  }

  return NextResponse.json({ id: message.id });
}
