import { getServerSession } from 'next-auth';
import { NextResponse, after } from 'next/server';
import { z } from 'zod';

import { isOwnBlobUrl } from '@/lib/attachments';
import { authOptions } from '@/lib/auth';
import { sendProjectUpdateEmail } from '@/lib/email';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

const schema = z.object({
  note: z.string().min(1),
  photoUrls: z.array(z.string().url().refine(isOwnBlobUrl, 'Must be an uploaded file.')).max(50).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PRO') {
    return NextResponse.json({ error: 'Only pros can post project updates.' }, { status: 403 });
  }

  const allowed = await checkRateLimit(`project-update:${session.user.id}`, 30, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many updates posted. Try again later.' }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { quote: { include: { proProfile: true } }, request: { include: { customer: true } } },
  });

  if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  if (booking.quote.proProfile.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }
  if (booking.status !== 'SCHEDULED' && booking.status !== 'IN_PROGRESS') {
    return NextResponse.json({ error: 'Updates can only be posted on an active booking.' }, { status: 409 });
  }

  const { note, photoUrls } = parsed.data;

  const update = await prisma.projectUpdate.create({
    data: { bookingId: booking.id, note, photoUrls: photoUrls ?? [] },
  });

  after(() =>
    sendProjectUpdateEmail({
      to: booking.request.customer.email,
      requestTitle: booking.request.title,
      businessName: booking.quote.proProfile.businessName,
      note,
      photoCount: photoUrls?.length ?? 0,
      requestId: booking.requestId,
    }),
  );
  after(() =>
    notify({
      userId: booking.request.customerId,
      type: 'PROJECT_UPDATE_POSTED',
      title: `Progress update: ${booking.request.title}`,
      body: note,
      url: `/requests/${booking.requestId}`,
    }),
  );

  return NextResponse.json({ id: update.id });
}
